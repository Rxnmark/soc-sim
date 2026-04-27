"""
Core simulation logic for the cybersecurity dashboard game.
Contains game loop, attack spawning, financial impact, and topology management.
Imported by simulation.py to keep files under 250 lines.
"""
import asyncio
import random
from datetime import datetime, timezone, timedelta

# Use Europe/Kiev timezone (UTC+3)
LOCAL_TZ = timezone(timedelta(hours=3))
from database import SessionLocal, security_logs_collection
import models
from sqlalchemy.orm import Session
from attack_definitions import (
    SIMULATION_ATTACKS,
    CRITICAL_GATEWAY_IDS,
    DEFAULT_ATTACK_WEIGHTS,
    ESCALATION_PHASE_SECONDS,
    STEALTH_FINANCIAL_INTERVAL,
    NORMAL_ATTACK_DELAY_MIN,
    NORMAL_ATTACK_DELAY_MAX,
    ESCALATED_ATTACK_DELAY_MIN,
    ESCALATED_ATTACK_DELAY_MAX,
    STANDARD_REBOOT_SECONDS,
)
from simulation_topology import SimulationTopology
from simulation_helpers import apply_attack_effect, schedule_ransomware_encryption


class SimulationCore(SimulationTopology):
    """Core simulation logic - game loop, attacks, and state management."""

    # ------------------------------------------------------------------
    # Core game loop
    # ------------------------------------------------------------------
    async def _game_loop(self):
        loop_start = asyncio.get_event_loop().time()

        while self.is_running:
            now = asyncio.get_event_loop().time()
            elapsed = now - self.start_time

            # --- Phase escalation after ESCALATION_PHASE_SECONDS ---
            if elapsed >= ESCALATION_PHASE_SECONDS and self.current_phase != "escalated":
                self.current_phase = "escalated"

            # --- Stealth financial exposure: +$50k every STEALTH_FINANCIAL_INTERVAL s ---
            if now - self._stealth_last_tick >= STEALTH_FINANCIAL_INTERVAL:
                await self._apply_stealth_financial_impact()
                self._stealth_last_tick = now

            # --- Attack timer ---
            if now - loop_start >= self._next_attack_delay:
                loop_start = now
                self._next_attack_delay = self._random_delay()
                print(f"[SIM] Attack timer triggered: next_attack_delay={self._next_attack_delay:.1f}s, loop_start={loop_start:.1f}, now={now:.1f}")
                await self._spawn_attack()
            else:
                time_remaining = self._next_attack_delay - (now - loop_start)
                if int(now) % 30 == 0:
                    print(f"[SIM] Game loop: financial_exposure={self.financial_exposure}, active_attacks={len(self.active_attacks)}, next_attack_in={time_remaining:.1f}s")

            await asyncio.sleep(1)

    # ------------------------------------------------------------------
    # Attack spawning
    # ------------------------------------------------------------------
    async def _spawn_attack(self):
        print(f"[SIM] _spawn_attack START: is_running={self.is_running}, active_attacks={len(self.active_attacks)}")
        db = SessionLocal()
        try:
            available = self._get_available_equipment(db)
            print(f"[SIM] _spawn_attack: {len(available)} available equipment found")
            available_ids = {
                eq.id for eq in available
                if eq.id not in self.active_attacks
            }
            print(f"[SIM] _spawn_attack: {len(available_ids)} available IDs (not in active_attacks)")
            if not available_ids:
                print(f"[SIM] _spawn_attack: No available equipment. All {len(available)} available devices are in active_attacks.")
                print(f"[SIM] _spawn_attack: active_attacks keys = {list(self.active_attacks.keys())}")
                print(f"[SIM] _spawn_attack: available equipment statuses = {[eq.status for eq in available]}")
                return

            ids = list(available_ids)
            random.shuffle(ids)
            target_id = ids[0]
            target = db.query(models.Equipment).filter(models.Equipment.id == target_id).first()
            if not target:
                print(f"[SIM] _spawn_attack: Target with id={target_id} not found in DB")
                return
            print(f"[SIM] _spawn_attack: Target = {target.name} (id={target_id}, status={target.status})")

            attack_category = self._pick_attack_type()
            source_ip = self._generate_unique_ip()
            print(f"[SIM] _spawn_attack: Selected attack={attack_category}, IP={source_ip}")

            # Pick a random subtype from the category (e.g., "CryptoLocker" from "Ransomware")
            attack_subtype = random.choice(SIMULATION_ATTACKS[attack_category]["types"])

            # Pick a random log event template
            log_event = random.choice(SIMULATION_ATTACKS[attack_category]["log_events"])
            description = log_event.format(target_name=target.name, attack_type=attack_subtype)
            timestamp = datetime.now(LOCAL_TZ)

            # Minor attacks: log + create a Warning-level risk (no active_attacks, no status effect)
            # This ensures equipment attacked by Minor attacks does NOT show as "Safe"
            if attack_category == "Minor":
                new_risk = models.RiskAssessment(
                    equipment_id=target_id,
                    risk_level="Warning",
                    description=f"{attack_subtype} detected on {target.name}: {description}",
                    is_resolved=False,
                    attack_type=attack_category,
                    financial_impact=0,
                    created_at=timestamp,
                )
                db.add(new_risk)
                db.commit()

                await security_logs_collection.insert_one({
                    "event_type": attack_subtype,
                    "description": description,
                    "source_ip": source_ip,
                    "target_ip": target.ip_address,
                    "timestamp": timestamp,
                })
                print(f"[SIM] _spawn_attack: Minor attack logged with Warning risk: {attack_subtype} on {target.name}")
                # Don't increment attack_history for Minor
                await self._update_topology_dependencies(db)
                db.close()
                return

            print(f"[SIM] _spawn_attack: Applying attack effect for {attack_category} on {target.name}")
            self._apply_attack_effect(target, attack_category, db)
            print(f"[SIM] _spawn_attack: After effect: status={target.status}")


            # Determine risk level for the new RiskAssessment record
            risk_level_map = {"DDoS": "Critical", "Ransomware": "High", "Stealth": "High"}
            risk_level = risk_level_map.get(attack_category, "High")
            print(f"[SIM] _spawn_attack: Assigned risk_level={risk_level} for attack={attack_category}")

            new_risk = models.RiskAssessment(
                equipment_id=target_id,
                risk_level=risk_level,
                description=f"{attack_subtype} detected on {target.name}: {description}",
                is_resolved=False,
                attack_type=attack_category,
                financial_impact=0,
                created_at=timestamp,
            )
            db.add(new_risk)
            db.commit()
            print(f"[SIM] _spawn_attack: Risk created: id={new_risk.id}")

            await security_logs_collection.insert_one({
                "event_type": attack_subtype,
                "description": description,
                "source_ip": source_ip,
                "target_ip": target.ip_address,
                "timestamp": timestamp,
            })
            print(f"[SIM] _spawn_attack: Log inserted into MongoDB")

            self.active_attacks[target_id] = {
                "type": attack_category,
                "source_ip": source_ip,
                "risk_id": new_risk.id,
                "financial_impact_total": 0,
                "applied_at": asyncio.get_event_loop().time(),
            }
            print(f"[SIM] _spawn_attack: Added to active_attacks, total={len(self.active_attacks)}")

            # No auto-cleanup — equipment stays in active_attacks until user applies fix

            self.attack_history[attack_category] = self.attack_history.get(attack_category, 0) + 1
            print(f"[SIM] _spawn_attack: attack_history = {self.attack_history}")
            await self._update_topology_dependencies(db)
            print(f"[SIM] _spawn_attack: _update_topology_dependencies done")

        except Exception as e:
            print(f"[SIM] _spawn_attack EXCEPTION: {e}")
            import traceback
            traceback.print_exc()
        finally:
            db.close()
            print(f"[SIM] _spawn_attack END: active_attacks={len(self.active_attacks)}")

    def _apply_attack_effect(self, target, attack_category: str, db: Session):
        """Delegate to simulation_helpers.apply_attack_effect."""
        apply_attack_effect(target, attack_category, db, self)
