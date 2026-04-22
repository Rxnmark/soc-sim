# General Workspace & Safety Guidelines

## 1. Architectural Approach
- **The 150-Line Limit:** If a file exceeds 150-200 lines, you are STRICTLY FORBIDDEN from using `write_to_file` to rewrite it completely. Local models degrade in formatting over long generations.
- **Mandatory Componentization:** If you need to make extensive changes to a large file, you must first propose breaking it down.
- **Separation of Concerns:** Separate data from logic. For example, if a file contains both a large config/data object (like a translation dictionary) and React component logic, your first step should be extracting the data into a separate file (e.g., `translations.ts` or `translations.json`) and importing it.
- Do not change the overall formatting style of the file (e.g., converting spaces to tabs) during local edits, as this breaks auto-formatting and subsequent diff matching.

## 2. Safe Editing
- Before modifying critical site files (configs, routing, main templates), ensure you fully understand their structure.
- When refactoring deeply indented logic, be extremely careful with the SEARCH block, copying the context with exact whitespace precision.

## 3. Strict Tool Sequence
- NEVER jump straight to `write_to_file` for existing files unless instructed by the user or if the file is completely broken. 
- You MUST attempt targeted `replace_in_file` operations first. Only use `write_to_file` as a fallback for files under 150 lines.


# Context & Task Management Protocol (CRITICAL)

To prevent context window overflow and degradation in logic, you must strictly follow this protocol for multi-file tasks:

## 1. The "Controlled Reading" Rule
- You may read up to 3-4 files at the beginning of a task SOLELY for the purpose of architectural analysis and planning. 
- However, when transitioning to the active editing phase, you must close unnecessary context and focus on modifying only one file at a time.

## 2. External State Management (The Tracker)
For any task involving multiple files or complex logical steps, you must manage your state externally using the file system:
- **Step 1:** Create a file named `cline_tracker.md` in the root of the project.
- **Step 2:** Write down the overall goal, the list of files to be processed, and create a step-by-step checklist.
- **Step 3:** Read and edit ONLY ONE target file at a time during the execution phase.
- **Step 4:** After successfully updating a file, you MUST update `cline_tracker.md` to check off that step. Record any crucial findings (e.g., shared variables, function names, or translation keys) needed for subsequent files.

## 3. Context Unloading
- When working on the next file, rely exclusively on your notes in `cline_tracker.md` to recall the context of previous files.
- If you feel your context is getting too large, or if you start making syntax errors with `replace_in_file` / `write_to_file`, stop immediately and ask the user: "My context is getting full. Please start a New Task and instruct me to continue according to the plan in `cline_tracker.md`."

## 4. Specification Handling
- If a specification file is provided for the task, read it carefully first. Do not load target codebase files until you have fully mapped the specification's logic into your `cline_tracker.md` checklist.

## 5. Final Cleanup
- Once all items in `cline_tracker.md` are successfully completed, you MUST delete this file yourself.
- Use the appropriate terminal or system tools to permanently remove `cline_tracker.md` to keep the workspace clean.
- Do not consider the task complete until the tracker file is successfully deleted.