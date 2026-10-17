CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(80) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'security', 'staff') NOT NULL DEFAULT 'staff',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username),
  KEY idx_users_role_active (role, is_active)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS students (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id_number VARCHAR(40) NOT NULL,
  full_name VARCHAR(180) NOT NULL,
  course_grade VARCHAR(100) NOT NULL,
  department VARCHAR(120) NOT NULL,
  id_status ENUM('active', 'pending') NOT NULL DEFAULT 'pending',
  date_registered DATE NOT NULL DEFAULT (CURRENT_DATE),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_students_student_id_number (student_id_number),
  KEY idx_students_name (full_name),
  KEY idx_students_status (id_status),
  KEY idx_students_department_course (department, course_grade)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS attendance_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id BIGINT UNSIGNED NOT NULL,
  time_in DATETIME NOT NULL,
  time_out DATETIME NULL,
  status ENUM('inside', 'exited') NOT NULL DEFAULT 'inside',
  `date` DATE NOT NULL,
  recorded_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_attendance_student_date (student_id, `date`),
  KEY idx_attendance_date ( `date` ),
  KEY idx_attendance_status_date (status, `date`),
  KEY idx_attendance_time_in (time_in),
  CONSTRAINT fk_attendance_student FOREIGN KEY (student_id)
    REFERENCES students(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_attendance_user FOREIGN KEY (recorded_by)
    REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;
