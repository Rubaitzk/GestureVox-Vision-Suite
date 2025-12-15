from flask import Flask, jsonify, request
from flask_cors import CORS
import mysql.connector
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
# Enable CORS to allow requests from your React Frontend (usually port 5173)
CORS(app) 

# Health check
@app.route('/api/health', methods=['GET'])
def health():
    try:
        conn = get_db_connection()
        conn.ping(reconnect=True)
        conn.close()
        return jsonify({"status": "ok"}), 200
    except Exception as e:
        return jsonify({"status": "error", "detail": str(e)}), 500

# --- DATABASE CONFIGURATION ---
# UPDATE THIS with the same password you used in VS Code
db_config = {
    'host': 'localhost',
    'user': 'root', 
    'password': 'mysql_4@', 
    'database': 'gestvox'
}

def get_db_connection():
    return mysql.connector.connect(**db_config)

# ==========================================
# AUTHENTICATION ROUTES
# ==========================================

# 1. SIGNUP (Create a new user)
@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.json
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')

    if not all([name, email, password]):
        return jsonify({"error": "Missing fields"}), 400

    # Hash the password for security
    hashed_password = generate_password_hash(password)

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Insert user into DB
        query = "INSERT INTO users (name, email, password_hash) VALUES (%s, %s, %s)"
        cursor.execute(query, (name, email, hashed_password))
        conn.commit()
        
        user_id = cursor.lastrowid
        cursor.close()
        conn.close()
        
        return jsonify({"message": "User created", "user_id": user_id}), 201
    except mysql.connector.Error as err:
        return jsonify({"error": str(err)}), 500

# 2. LOGIN (Verify user)
@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    # Find user by email
    query = "SELECT * FROM users WHERE email = %s"
    cursor.execute(query, (email,))
    user = cursor.fetchone()
    
    cursor.close()
    conn.close()

    if user and check_password_hash(user['password_hash'], password):
        return jsonify({
            "message": "Login successful",
            "user": {
                "user_id": user['user_id'],
                "name": user['name'],
                "email": user['email']
            }
        }), 200
    else:
        return jsonify({"error": "Invalid email or password"}), 401

# ==========================================
# CHATBOT ROUTES
# ==========================================

# 3. GET CHAT HISTORY (Sidebar List)
@app.route('/api/chatbot/history', methods=['GET'])
def get_chat_history():
    user_id = request.args.get('user_id')
    client_token = request.args.get('client_token')

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Fetch sessions for this user or client token, newest first
    if client_token:
        query = "SELECT * FROM chatbot_sessions WHERE client_token = %s ORDER BY started_at DESC"
        cursor.execute(query, (client_token,))
    else:
        query = "SELECT * FROM chatbot_sessions WHERE user_id = %s ORDER BY started_at DESC"
        cursor.execute(query, (user_id,))

    sessions = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(sessions)


@app.route('/api/home/history', methods=['GET'])
def get_home_history():
    user_id = request.args.get('user_id')
    client_token = request.args.get('client_token')

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    if client_token:
        query = "SELECT * FROM home_sessions WHERE client_token = %s ORDER BY started_at DESC"
        cursor.execute(query, (client_token,))
    else:
        query = "SELECT * FROM home_sessions WHERE user_id = %s ORDER BY started_at DESC"
        cursor.execute(query, (user_id,))

    sessions = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(sessions)


@app.route('/api/home/session', methods=['POST'])
def create_home_session():
    data = request.json
    user_id = data.get('user_id')
    client_token = data.get('client_token')
    title = data.get('title') or 'Home Session'
    # accept guest/non-int user ids: store NULL
    try:
        user_id_val = int(user_id)
    except Exception:
        user_id_val = None

    conn = get_db_connection()
    cursor = conn.cursor()

    query = "INSERT INTO home_sessions (user_id, client_token, title) VALUES (%s, %s, %s)"
    cursor.execute(query, (user_id_val, client_token, title))
    conn.commit()

    new_session_id = cursor.lastrowid
    cursor.close()
    conn.close()

    return jsonify({"session_id": new_session_id}), 201


@app.route('/api/home/message', methods=['POST'])
def save_home_message():
    data = request.json
    session_id = data.get('home_session_id')
    sender = data.get('sender')
    input_text = data.get('input_text')
    translated = data.get('translated_text')

    conn = get_db_connection()
    cursor = conn.cursor()

    query = "INSERT INTO home_messages (home_session_id, sender, input_text, translated_text) VALUES (%s, %s, %s, %s)"
    cursor.execute(query, (session_id, sender, input_text, translated))
    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({"status": "saved"}), 201


@app.route('/api/home/messages', methods=['GET'])
def get_home_messages():
    session_id = request.args.get('session_id')

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    query = "SELECT * FROM home_messages WHERE home_session_id = %s ORDER BY created_at ASC"
    cursor.execute(query, (session_id,))
    messages = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(messages)


@app.route('/api/history', methods=['GET'])
def get_all_history():
    user_id = request.args.get('user_id')
    client_token = request.args.get('client_token')
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    if client_token:
        cursor.execute("SELECT * FROM home_sessions WHERE client_token = %s ORDER BY started_at DESC", (client_token,))
        home = cursor.fetchall()
        cursor.execute("SELECT * FROM chatbot_sessions WHERE client_token = %s ORDER BY started_at DESC", (client_token,))
        chatbot = cursor.fetchall()
    else:
        cursor.execute("SELECT * FROM home_sessions WHERE user_id = %s ORDER BY started_at DESC", (user_id,))
        home = cursor.fetchall()
        cursor.execute("SELECT * FROM chatbot_sessions WHERE user_id = %s ORDER BY started_at DESC", (user_id,))
        chatbot = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify({"home": home, "chatbot": chatbot})

# 4. CREATE NEW SESSION (Clicking "New Chat")
@app.route('/api/chatbot/session', methods=['POST'])
def create_session():
    data = request.json
    user_id = data.get('user_id')
    client_token = data.get('client_token')
    # accept guest/non-int user ids: store NULL in DB
    try:
        user_id_val = int(user_id)
    except Exception:
        user_id_val = None

    conn = get_db_connection()
    cursor = conn.cursor()

    query = "INSERT INTO chatbot_sessions (user_id, client_token) VALUES (%s, %s)"
    cursor.execute(query, (user_id_val, client_token))
    conn.commit()

    new_session_id = cursor.lastrowid
    cursor.close()
    conn.close()

    return jsonify({"session_id": new_session_id}), 201


# DELETE CHATBOT SESSION (and messages)
@app.route('/api/chatbot/session/<int:session_id>', methods=['DELETE'])
def delete_chatbot_session(session_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM chatbot_messages WHERE chatbot_session_id = %s", (session_id,))
        cursor.execute("DELETE FROM chatbot_sessions WHERE chatbot_session_id = %s", (session_id,))
        conn.commit()
    finally:
        cursor.close()
        conn.close()
    return jsonify({"status": "deleted"}), 200

# 5. SAVE MESSAGE (When user sends a message)
@app.route('/api/chatbot/message', methods=['POST'])
def save_message():
    data = request.json
    session_id = data.get('chatbot_session_id')
    sender = data.get('sender') # 'user' or 'bot'
    input_text = data.get('input_text')
    output_text = data.get('output_text') # If bot, this might be the response
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = """
        INSERT INTO chatbot_messages 
        (chatbot_session_id, sender, input_text, output_text) 
        VALUES (%s, %s, %s, %s)
    """
    cursor.execute(query, (session_id, sender, input_text, output_text))
    conn.commit()
    
    cursor.close()
    conn.close()
    
    return jsonify({"status": "saved"}), 201

# 6. GET MESSAGES FOR A SPECIFIC SESSION (Clicking a history item)
@app.route('/api/chatbot/messages', methods=['GET'])
def get_session_messages():
    session_id = request.args.get('session_id')
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    query = "SELECT * FROM chatbot_messages WHERE chatbot_session_id = %s ORDER BY created_at ASC"
    cursor.execute(query, (session_id,))
    messages = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    return jsonify(messages)


# ==========================================
# LANGUAGES, PREFERENCES, TTS, TRANSLATION, ERRORS
# ==========================================


@app.route('/api/languages', methods=['GET'])
def get_languages():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM languages ORDER BY language_name ASC")
    langs = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(langs)


@app.route('/api/user', methods=['GET'])
def get_user():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({}), 400
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT user_id, name, email, created_at FROM users WHERE user_id = %s", (user_id,))
    u = cursor.fetchone()
    cursor.close()
    conn.close()
    if not u:
        return jsonify({}), 404
    return jsonify(u)


@app.route('/api/user', methods=['PUT'])
def update_user():
    data = request.json
    user_id = data.get('user_id')
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')

    if not user_id:
        return jsonify({"error": "user_id required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    fields = []
    params = []
    if name:
        fields.append('name = %s')
        params.append(name)
    if email:
        fields.append('email = %s')
        params.append(email)
    if password:
        fields.append('password_hash = %s')
        params.append(generate_password_hash(password))

    if not fields:
        cursor.close()
        conn.close()
        return jsonify({"status": "no changes"}), 200

    params.append(user_id)
    query = f"UPDATE users SET {', '.join(fields)} WHERE user_id = %s"
    cursor.execute(query, tuple(params))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"status": "updated"}), 200


@app.route('/api/preferences', methods=['GET', 'POST'])
def preferences():
    if request.method == 'GET':
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({}), 400
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM user_preferences WHERE user_id = %s", (user_id,))
        p = cursor.fetchone()
        cursor.close()
        conn.close()
        return jsonify(p or {})

    # POST -> create or update
    data = request.json
    user_id = data.get('user_id')
    preferred_language_id = data.get('preferred_language_id')
    tts_voice = data.get('tts_voice')
    tts_speed = data.get('tts_speed')
    theme = data.get('theme')

    if not user_id:
        return jsonify({"error": "user_id required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    # Check exist
    cursor.execute("SELECT preference_id FROM user_preferences WHERE user_id = %s", (user_id,))
    row = cursor.fetchone()
    if row:
        query = "UPDATE user_preferences SET preferred_language_id = %s, tts_voice = %s, tts_speed = %s, theme = %s WHERE user_id = %s"
        cursor.execute(query, (preferred_language_id, tts_voice, tts_speed, theme, user_id))
    else:
        query = "INSERT INTO user_preferences (user_id, preferred_language_id, tts_voice, tts_speed, theme) VALUES (%s, %s, %s, %s, %s)"
        cursor.execute(query, (user_id, preferred_language_id, tts_voice, tts_speed, theme))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"status": "saved"}), 201


@app.route('/api/tts', methods=['GET', 'POST'])
def tts_sessions_api():
    if request.method == 'GET':
        user_id = request.args.get('user_id')
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM tts_sessions WHERE user_id = %s ORDER BY created_at DESC", (user_id,))
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify(rows)

    data = request.json
    user_id = data.get('user_id')
    input_text = data.get('input_text')
    language_id = data.get('language_id')
    voice = data.get('voice')
    audio_path = data.get('audio_path')

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO tts_sessions (user_id, input_text, language_id, voice, audio_path) VALUES (%s, %s, %s, %s, %s)", (user_id, input_text, language_id, voice, audio_path))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"status": "saved"}), 201


@app.route('/api/translation', methods=['GET', 'POST'])
def translation_api():
    if request.method == 'GET':
        user_id = request.args.get('user_id')
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM translation_sessions WHERE user_id = %s ORDER BY created_at DESC", (user_id,))
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify(rows)

    data = request.json
    user_id = data.get('user_id')
    input_text = data.get('input_text')
    output_text = data.get('output_text')
    source_language_id = data.get('source_language_id')
    target_language_id = data.get('target_language_id')

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO translation_sessions (user_id, input_text, output_text, source_language_id, target_language_id) VALUES (%s, %s, %s, %s, %s)", (user_id, input_text, output_text, source_language_id, target_language_id))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"status": "saved"}), 201


@app.route('/api/error', methods=['POST'])
def log_error():
    data = request.json
    user_id = data.get('user_id')
    error_type = data.get('error_type')
    message = data.get('message')

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO error_logs (user_id, error_type, message) VALUES (%s, %s, %s)", (user_id, error_type, message))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"status": "logged"}), 201


@app.route('/api/migrate_sessions', methods=['POST'])
def migrate_sessions():
    data = request.json
    user_id = data.get('user_id')
    client_token = data.get('client_token')

    if not user_id or not client_token:
        return jsonify({"error": "user_id and client_token required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("UPDATE chatbot_sessions SET user_id = %s WHERE client_token = %s", (user_id, client_token))
    cursor.execute("UPDATE home_sessions SET user_id = %s WHERE client_token = %s", (user_id, client_token))
    conn.commit()
    affected = cursor.rowcount
    cursor.close()
    conn.close()

    return jsonify({"status": "migrated"}), 200


# DELETE HOME SESSION (and messages)
@app.route('/api/home/session/<int:session_id>', methods=['DELETE'])
def delete_home_session(session_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM home_messages WHERE home_session_id = %s", (session_id,))
        cursor.execute("DELETE FROM home_sessions WHERE home_session_id = %s", (session_id,))
        conn.commit()
    finally:
        cursor.close()
        conn.close()
    return jsonify({"status": "deleted"}), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000)