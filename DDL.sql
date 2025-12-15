

USE gestvox;
-- USERS
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(150) UNIQUE,
    password_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- LANGUAGES
CREATE TABLE languages (
    language_id INT AUTO_INCREMENT PRIMARY KEY,
    language_name VARCHAR(100),
    language_code VARCHAR(10),
    direction VARCHAR(10)   
);
-- USER PREFERENCES
CREATE TABLE user_preferences (
    preference_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    preferred_language_id INT,
    tts_voice VARCHAR(50),
    tts_speed FLOAT,
    theme VARCHAR(50),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (preferred_language_id) REFERENCES languages(language_id)
);
-- CHATBOT SESSIONS
CREATE TABLE chatbot_sessions (
    chatbot_session_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    client_token VARCHAR(100),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);
-- CHATBOT MESSAGES
CREATE TABLE chatbot_messages (
    message_id INT AUTO_INCREMENT PRIMARY KEY,
    chatbot_session_id INT NOT NULL,
    sender VARCHAR(20),          -- user / bot
    input_text TEXT,
    output_text TEXT,
    language_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chatbot_session_id) REFERENCES chatbot_sessions(chatbot_session_id),
    FOREIGN KEY (language_id) REFERENCES languages(language_id)
);
-- HOME SESSIONS (used by frontend for quick speech/translate sessions)
CREATE TABLE home_sessions (
    home_session_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    client_token VARCHAR(100),
    title VARCHAR(200),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- HOME MESSAGES
CREATE TABLE home_messages (
    home_message_id INT AUTO_INCREMENT PRIMARY KEY,
    home_session_id INT NOT NULL,
    sender VARCHAR(20),
    input_text TEXT,
    translated_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (home_session_id) REFERENCES home_sessions(home_session_id)
);

-- TTS SESSIONS
CREATE TABLE tts_sessions (
    tts_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    input_text TEXT,
    language_id INT,
    voice VARCHAR(50),
    audio_path VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (language_id) REFERENCES languages(language_id)
);
-- TRANSLATION SESSIONS
CREATE TABLE translation_sessions (
    translation_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    input_text TEXT,
    output_text TEXT,
    source_language_id INT,
    target_language_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (source_language_id) REFERENCES languages(language_id),
    FOREIGN KEY (target_language_id) REFERENCES languages(language_id)
);
-- ERROR LOGS
CREATE TABLE error_logs (
    error_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    error_type VARCHAR(100),
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Seed basic languages used by frontend
INSERT IGNORE INTO languages (language_name, language_code, direction) VALUES ('English','en','ltr');
INSERT IGNORE INTO languages (language_name, language_code, direction) VALUES ('Urdu','ur','rtl');
INSERT IGNORE INTO languages (language_name, language_code, direction) VALUES ('Spanish','es','ltr');
INSERT IGNORE INTO languages (language_name, language_code, direction) VALUES ('French','fr','ltr');


