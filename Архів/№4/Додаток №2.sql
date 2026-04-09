-- Створення бази даних
CREATE DATABASE IF NOT EXISTS Tokarniy_Ceh 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE Tokarniy_Ceh;

-- Таблиця працівників
CREATE TABLE Працівники (
    id_працівника INT PRIMARY KEY AUTO_INCREMENT,
    ПІБ VARCHAR(100) NOT NULL,
    посада ENUM('Оператор', 'Технолог', 'Контролер', 'Механік', 'Начальник') NOT NULL,
    відділ VARCHAR(50),
    контакти VARCHAR(100),
    дата_найму DATE,
    статус ENUM('Активний', 'Неактивний') DEFAULT 'Активний'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Таблиця верстатів
CREATE TABLE Верстати (
    id_верстата INT PRIMARY KEY AUTO_INCREMENT,
    назва_верстата VARCHAR(100) NOT NULL,
    модель VARCHAR(100),
    інвентарний_номер VARCHAR(50) UNIQUE,
    тип ENUM('Токарний', 'Фрезерний', 'Свердлильний') DEFAULT 'Токарний',
    статус ENUM('Робочий', 'Ремонт', 'Простой') DEFAULT 'Робочий',
    дата_введення DATE,
    дата_останнього_ППР DATE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Таблиця деталей
CREATE TABLE Деталі (
    id_деталі INT PRIMARY KEY AUTO_INCREMENT,
    назва_деталі VARCHAR(100) NOT NULL,
    код_деталі VARCHAR(50) UNIQUE NOT NULL,
    матеріал VARCHAR(50),
    вага DECIMAL(10,3),
    креслення VARCHAR(255),
    опис TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Таблиця замовлень
CREATE TABLE Замовлення (
    id_замовлення INT PRIMARY KEY AUTO_INCREMENT,
    номер_замовлення VARCHAR(50) UNIQUE NOT NULL,
    клієнт VARCHAR(100) NOT NULL,
    дата_отримання DATE NOT NULL,
    дата_виконання DATE,
    пріоритет ENUM('Низький', 'Середній', 'Високий') DEFAULT 'Середній',
    статус ENUM('Нове', 'В роботі', 'Виконано', 'Скасовано') DEFAULT 'Нове',
    загальна_вартість DECIMAL(15,2)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Таблиця виробничих завдань
CREATE TABLE ВиробничіЗавдання (
    id_завдання INT PRIMARY KEY AUTO_INCREMENT,
    id_замовлення INT NOT NULL,
    id_деталі INT NOT NULL,
    кількість INT NOT NULL,
    дата_початку_план DATE,
    дата_закінчення_план DATE,
    дата_початку_факт DATE,
    дата_закінчення_факт DATE,
    статус ENUM('Заплановано', 'В роботі', 'Виконано', 'Припинено') DEFAULT 'Заплановано',
    FOREIGN KEY (id_замовлення) REFERENCES Замовлення(id_замовлення) ON DELETE CASCADE,
    FOREIGN KEY (id_деталі) REFERENCES Деталі(id_деталі) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Таблиця технологічних процесів
CREATE TABLE ТехнологічніПроцеси (
    id_процесу INT PRIMARY KEY AUTO_INCREMENT,
    id_деталі INT NOT NULL,
    назва_процесу VARCHAR(100) NOT NULL,
    версія VARCHAR(20),
    опис TEXT,
    дата_створення TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    автор INT,
    FOREIGN KEY (id_деталі) REFERENCES Деталі(id_деталі) ON DELETE CASCADE,
    FOREIGN KEY (автор) REFERENCES Працівники(id_працівника) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Таблиця операцій
CREATE TABLE Операції (
    id_операції INT PRIMARY KEY AUTO_INCREMENT,
    id_процесу INT NOT NULL,
    id_верстата INT NOT NULL,
    назва_операції VARCHAR(100) NOT NULL,
    порядковий_номер INT NOT NULL,
    УП_файл VARCHAR(255),
    норма_часу DECIMAL(10,2) NOT NULL,
    інструмент VARCHAR(100),
    опис TEXT,
    FOREIGN KEY (id_процесу) REFERENCES ТехнологічніПроцеси(id_процесу) ON DELETE CASCADE,
    FOREIGN KEY (id_верстата) REFERENCES Верстати(id_верстата) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Таблиця виконання операцій
CREATE TABLE ВиконанняОперацій (
    id_виконання INT PRIMARY KEY AUTO_INCREMENT,
    id_операції INT NOT NULL,
    id_завдання INT NOT NULL,
    id_оператора INT NOT NULL,
    час_початку_план TIMESTAMP,
    час_закінчення_план TIMESTAMP,
    час_початку_факт TIMESTAMP,
    час_закінчення_факт TIMESTAMP,
    фактичний_час DECIMAL(10,2),
    статус ENUM('Заплановано', 'В роботі', 'Виконано', 'Простой') DEFAULT 'Заплановано',
    кількість_придатних INT,
    кількість_браку INT,
    FOREIGN KEY (id_операції) REFERENCES Операції(id_операції) ON DELETE RESTRICT,
    FOREIGN KEY (id_завдання) REFERENCES ВиробничіЗавдання(id_завдання) ON DELETE CASCADE,
    FOREIGN KEY (id_оператора) REFERENCES Працівники(id_працівника) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Таблиця контролю якості
CREATE TABLE КонтрольЯкості (
    id_контролю INT PRIMARY KEY AUTO_INCREMENT,
    id_виконання INT NOT NULL,
    id_контролера INT NOT NULL,
    дата_контролю TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    результат ENUM('Прийнято', 'Брак', 'На доопрацювання') NOT NULL,
    виміряні_параметри JSON,
    дефекти TEXT,
    коментар TEXT,
    FOREIGN KEY (id_виконання) REFERENCES ВиконанняОперацій(id_виконання) ON DELETE CASCADE,
    FOREIGN KEY (id_контролера) REFERENCES Працівники(id_працівника) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Таблиця моніторингу обладнання
CREATE TABLE МоніторингОбладнання (
    id_моніторингу INT PRIMARY KEY AUTO_INCREMENT,
    id_верстата INT NOT NULL,
    час_зняття TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    температура DECIMAL(5,2),
    вібрація DECIMAL(8,4),
    навантаження DECIMAL(5,2),
    час_роботи_включений INT,
    статус ENUM('Норма', 'Попередження', 'Аварія') DEFAULT 'Норма',
    FOREIGN KEY (id_верстата) REFERENCES Верстати(id_верстата) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Таблиця звітності
CREATE TABLE Звітність (
    id_звіту INT PRIMARY KEY AUTO_INCREMENT,
    тип_звіту ENUM('Виробничий', 'Якості', 'Ефективності', 'Простоїв') NOT NULL,
    період_з DATE NOT NULL,
    період_по DATE NOT NULL,
    дані_звіту JSON,
    час_формування TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    автор INT,
    FOREIGN KEY (автор) REFERENCES Працівники(id_працівника) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Індекси для оптимізації продуктивності
CREATE INDEX idx_замовлення_статус ON Замовлення(статус);
CREATE INDEX idx_замовлення_дата ON Замовлення(дата_отримання);
CREATE INDEX idx_замовлення_клієнт ON Замовлення(клієнт);

CREATE INDEX idx_завдання_статус ON ВиробничіЗавдання(статус);
CREATE INDEX idx_завдання_дата_початку ON ВиробничіЗавдання(дата_початку_план);
CREATE INDEX idx_завдання_дата_закінчення ON ВиробничіЗавдання(дата_закінчення_план);
CREATE INDEX idx_завдання_замовлення ON ВиробничіЗавдання(id_замовлення);

CREATE INDEX idx_виконання_статус ON ВиконанняОперацій(статус);
CREATE INDEX idx_виконання_оператор ON ВиконанняОперацій(id_оператора);
CREATE INDEX idx_виконання_час_початку ON ВиконанняОперацій(час_початку_факт);
CREATE INDEX idx_виконання_завдання ON ВиконанняОперацій(id_завдання);

CREATE INDEX idx_моніторинг_верстат_час ON МоніторингОбладнання(id_верстата, час_зняття);
CREATE INDEX idx_моніторинг_статус ON МоніторингОбладнання(статус);
CREATE INDEX idx_моніторинг_дата ON МоніторингОбладнання(час_зняття);

CREATE INDEX idx_контроль_дата ON КонтрольЯкості(дата_контролю);
CREATE INDEX idx_контроль_результат ON КонтрольЯкості(результат);
CREATE INDEX idx_контроль_виконання ON КонтрольЯкості(id_виконання);

CREATE INDEX idx_звітність_період ON Звітність(період_з, період_по);
CREATE INDEX idx_звітність_тип ON Звітність(тип_звіту);

CREATE INDEX idx_працівники_посада ON Працівники(посада);
CREATE INDEX idx_деталі_код ON Деталі(код_деталі);
CREATE INDEX idx_верстати_статус ON Верстати(статус);