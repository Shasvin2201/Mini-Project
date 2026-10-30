const mysql = require("mysql2");

const db = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "campus_space",
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Function to initialize tables and seed default data if needed
function initializeDatabase(callback) {
    db.getConnection((err, connection) => {
        if (err) {
            console.error("MySQL Connection Pool Error:", err.message);
            if (typeof callback === "function") callback(err);
            return;
        }

        console.log("MySQL Pool connected successfully!");

        // 1. Create users table
        const createUsersTable = `
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                role ENUM('admin', 'faculty', 'management') NOT NULL DEFAULT 'faculty',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB;
        `;

        // 2. Create spaces table
        const createSpacesTable = `
            CREATE TABLE IF NOT EXISTS spaces (
                id INT AUTO_INCREMENT PRIMARY KEY,
                space_name VARCHAR(255) NOT NULL,
                block VARCHAR(100) NOT NULL,
                type VARCHAR(100) NOT NULL,
                capacity INT NOT NULL,
                status VARCHAR(50) DEFAULT 'Available'
            ) ENGINE=InnoDB;
        `;

        // 3. Create requests table
        const createRequestsTable = `
            CREATE TABLE IF NOT EXISTS requests (
                id INT AUTO_INCREMENT PRIMARY KEY,
                faculty_id INT NOT NULL,
                space_id INT NOT NULL,
                request_date DATE NOT NULL,
                start_time TIME NOT NULL,
                end_time TIME NOT NULL,
                required_capacity INT NOT NULL,
                purpose TEXT NOT NULL,
                status VARCHAR(50) DEFAULT 'Pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        `;

        // 4. Create audit_logs table
        const createAuditLogsTable = `
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NULL,
                user_email VARCHAR(255) NULL,
                user_role VARCHAR(50) NULL,
                action VARCHAR(100) NOT NULL,
                target_type VARCHAR(50) NULL,
                target_id INT NULL,
                details TEXT NULL,
                ip_address VARCHAR(100) DEFAULT '127.0.0.1',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX (user_id),
                INDEX (action)
            ) ENGINE=InnoDB;
        `;

        connection.query(createUsersTable, (err) => {
            if (err) console.error("Error creating users table:", err.message);
            
            connection.query(createSpacesTable, (err) => {
                if (err) console.error("Error creating spaces table:", err.message);

                connection.query(createRequestsTable, (err) => {
                    if (err) console.error("Error creating requests table:", err.message);

                    connection.query(createAuditLogsTable, (err) => {
                        if (err) console.error("Error creating audit_logs table:", err.message);

                        // Ensure spaces status column supports 'Inactive'
                        connection.query("ALTER TABLE spaces MODIFY COLUMN status VARCHAR(50) DEFAULT 'Available'", (alterErr) => {
                            if (alterErr) console.warn("Notice: spaces status column already modified or not required");

                            // Seed default accounts if users table is empty
                            connection.query("SELECT COUNT(*) AS count FROM users", (err, results) => {
                            if (!err && results && results[0].count === 0) {
                                const seedUsers = `
                                    INSERT INTO users (id, name, email, password, role) VALUES
                                    (1, 'System Admin', 'admin@campus.com', '$2b$10$HqjFMx2RhWpSKLiB4X9nL.PxXiXF4nzSsYIYNUKubQn74lajoWmgG', 'admin'),
                                    (2, 'Faculty Member', 'faculty@campus.com', '$2b$10$NStVt0TuUwHabjcml/6PY.wS1DpQ9b7qyAQLIUGTo2k5MbObEnTOi', 'faculty'),
                                    (3, 'Campus Management', 'management@campus.com', '$2b$10$pHKtd.GFTiMLcnJvGOccyO/otEcWRR8yqwBbnG77rWnp/Z1pIz6NC', 'management');
                                `;
                                connection.query(seedUsers, (err) => {
                                    if (err) console.error("Error seeding users:", err.message);
                                    else console.log("Default user accounts created successfully!");
                                });
                            }
                        });

                        // Seed 20 campus spaces across Blocks A, B, C, D if spaces table is empty
                        connection.query("SELECT COUNT(*) AS count FROM spaces", (err, results) => {
                            if (!err && results && results[0].count === 0) {
                                const seedSpaces = `
                                    INSERT INTO spaces (space_name, block, type, capacity, status) VALUES
                                    ('CR-A101', 'Block A', 'Classroom', 60, 'Available'),
                                    ('CR-A102', 'Block A', 'Classroom', 40, 'Available'),
                                    ('CR-A103', 'Block A', 'Classroom', 50, 'Available'),
                                    ('LAB-A01', 'Block A', 'Lab', 30, 'Available'),
                                    ('SH-A01', 'Block A', 'Seminar Hall', 100, 'Available'),
                                    ('CR-B101', 'Block B', 'Classroom', 60, 'Available'),
                                    ('CR-B102', 'Block B', 'Classroom', 40, 'Available'),
                                    ('CR-B103', 'Block B', 'Classroom', 50, 'Available'),
                                    ('LAB-B01', 'Block B', 'Lab', 30, 'Available'),
                                    ('SH-B01', 'Block B', 'Seminar Hall', 100, 'Available'),
                                    ('CR-C101', 'Block C', 'Classroom', 60, 'Available'),
                                    ('CR-C102', 'Block C', 'Classroom', 40, 'Available'),
                                    ('LAB-C01', 'Block C', 'Lab', 30, 'Available'),
                                    ('LAB-C02', 'Block C', 'Lab', 40, 'Available'),
                                    ('SH-C01', 'Block C', 'Seminar Hall', 100, 'Available'),
                                    ('CR-D101', 'Block D', 'Classroom', 60, 'Available'),
                                    ('CR-D102', 'Block D', 'Classroom', 40, 'Available'),
                                    ('LAB-D01', 'Block D', 'Lab', 30, 'Available'),
                                    ('LAB-D02', 'Block D', 'Lab', 40, 'Available'),
                                    ('SH-D01', 'Block D', 'Seminar Hall', 100, 'Available');
                                `;
                                connection.query(seedSpaces, (sErr) => {
                                    if (sErr) console.error("Error seeding spaces:", sErr.message);
                                    else console.log("Finalized 20 campus spaces seeded successfully!");
                                    connection.release();
                                    if (typeof callback === "function") callback();
                                });
                            } else {
                                connection.release();
                                if (typeof callback === "function") callback();
                            }
                        });
                    });
                });
            });
        });
    });
    });
}

db.initializeDatabase = initializeDatabase;
module.exports = db;