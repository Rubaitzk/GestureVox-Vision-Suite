import os
import mysql.connector
import random
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from gtts import gTTS
from deep_translator import GoogleTranslator

# 1. INITIALIZE APP (Must be before routes)
app = Flask(__name__)
# Enable CORS to allow requests from your React Frontend
CORS(app) 

# --- DATABASE CONFIGURATION ---
# UPDATE THIS with your actual password
db_config = {
    'host': 'localhost',
    'user': 'root', 
    'password': 'mysql_4@', 
    'database': 'gestvox'
}

def get_db_connection():
    # Try default connection first. Some MySQL servers (MySQL 8+) use
    # caching_sha2_password as the default authentication plugin which
    # can cause the client library to error if it doesn't support it.
    try:
        return mysql.connector.connect(**db_config)
    except mysql.connector.Error as e:
        msg = str(e).lower()
        # If the error is related to caching_sha2_password, retry with
        # the older mysql_native_password plugin (best-effort fallback).
        if 'caching_sha2_password' in msg or 'auth plugin' in msg:
            cfg = dict(db_config)
            cfg['auth_plugin'] = 'mysql_native_password'
            try:
                conn = mysql.connector.connect(**cfg)
                # annotate connection object for diagnostics
                setattr(conn, '_auth_fallback_used', True)
                return conn
            except Exception:
                # If fallback also fails, raise original exception for clarity
                raise
        raise

# ==========================================
# HEALTH CHECK
# ==========================================
@app.route('/api/health', methods=['GET'])
def health():
    try:
        conn = get_db_connection()
        conn.ping(reconnect=True)
        conn.close()
        return jsonify({"status": "ok"}), 200
    except Exception as e:
        return jsonify({"status": "error", "detail": str(e)}), 500


# Simple glove simulate endpoint: returns a random gesture text (one-off trigger)
@app.route('/api/glove/simulate', methods=['GET'])
def glove_simulate():
    gestures = [
        "Hello, how are you?",
        "Please help me",
        "I am feeling unwell",
        "Thank you very much",
    ]
    return jsonify({"status": "glove_on", "gesture_text": random.choice(gestures)})

# ==========================================
# AUTHENTICATION ROUTES
# ==========================================

@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.json
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    if not all([name, email, password]):
        return jsonify({"error": "Missing fields"}), 400

    # Basic validation: require gmail address and minimum password length
    if not str(email).lower().endswith('@gmail.com'):
        return jsonify({"error": "Email must be a @gmail.com address"}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    # Hash the password for security
    hashed_password = generate_password_hash(password)

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Check if email already exists
        cursor.execute("SELECT user_id FROM users WHERE email = %s", (email,))
        existing = cursor.fetchone()
        if existing:
            cursor.close()
            conn.close()
            return jsonify({"error": "Email already in use"}), 409

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

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"error": "Missing fields"}), 400
    if not str(email).lower().endswith('@gmail.com'):
        return jsonify({"error": "Email must be a @gmail.com address"}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
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

@app.route('/api/chatbot/history', methods=['GET'])
def get_chat_history():
    user_id = request.args.get('user_id')
    client_token = request.args.get('client_token')

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

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

@app.route('/api/chatbot/session', methods=['POST'])
def create_session():
    data = request.json
    user_id = data.get('user_id')
    client_token = data.get('client_token')
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

@app.route('/api/chatbot/message', methods=['POST'])
def save_message():
    data = request.json
    session_id = data.get('chatbot_session_id')
    sender = data.get('sender')
    input_text = data.get('input_text')
    output_text = data.get('output_text')

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

# ==========================================
# HOME / HISTORY ROUTES
# ==========================================

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
    cursor.close()
    conn.close()
    return jsonify({"status": "migrated"}), 200

# ==========================================
# USER & PREFERENCES
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

# ==========================================
# SMART TTS ROUTE (Modified to Generate & Save)
# ==========================================
@app.route('/api/tts', methods=['GET', 'POST'])
def tts_sessions_api():
    # GET: Just fetch history
    if request.method == 'GET':
        user_id = request.args.get('user_id')
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM tts_sessions WHERE user_id = %s ORDER BY created_at DESC", (user_id,))
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify(rows)

    # POST: Smart Generation (Check Cache -> Generate -> Save)
    data = request.json
    user_id = data.get('user_id')
    input_text = data.get('input_text')
    language_code = data.get('language_code', 'en') # e.g. 'en', 'es'
    
    # 1. CHECK CACHE
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    # Find language_id for query
    cursor.execute("SELECT language_id FROM languages WHERE language_code = %s", (language_code,))
    lang_res = cursor.fetchone()
    language_id = lang_res['language_id'] if lang_res else 1

    query = "SELECT audio_path FROM tts_sessions WHERE input_text = %s AND language_id = %s LIMIT 1"
    cursor.execute(query, (input_text, language_id))
    existing_record = cursor.fetchone()
    
    if existing_record:
        cursor.close()
        conn.close()
        return jsonify({"status": "success", "audio_path": existing_record['audio_path'], "cached": True})

    # 2. GENERATE
    try:
        # Create unique filename
        filename = f"tts_{abs(hash(input_text))}_{language_code}.mp3"
        # Ensure static/audio folder exists
        save_dir = os.path.join(app.root_path, 'static', 'audio')
        os.makedirs(save_dir, exist_ok=True)
        save_path = os.path.join(save_dir, filename)
        
        # Determine URL path (for frontend to access)
        web_path = f"/static/audio/{filename}"

        tts = gTTS(text=input_text, lang=language_code, slow=False)
        tts.save(save_path)
        
        # 3. SAVE TO DB
        cursor.execute("""
            INSERT INTO tts_sessions (user_id, input_text, language_id, voice, audio_path) 
            VALUES (%s, %s, %s, %s, %s)
        """, (user_id, input_text, language_id, 'gtts_default', web_path))
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return jsonify({"status": "success", "audio_path": web_path, "cached": False})

    except Exception as e:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()
        return jsonify({"error": str(e)}), 500

# ==========================================
# SMART TRANSLATION ROUTE (Modified to Translate & Save)
# ==========================================
@app.route('/api/translation', methods=['GET', 'POST'])
def translation_api():
    # GET: Fetch History
    if request.method == 'GET':
        user_id = request.args.get('user_id')
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM translation_sessions WHERE user_id = %s ORDER BY created_at DESC", (user_id,))
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify(rows)

    # POST: Smart Translation (Check Cache -> Translate -> Save)
    data = request.json
    user_id = data.get('user_id')
    input_text = data.get('input_text')
    source_lang = data.get('source_lang', 'en')
    target_lang = data.get('target_lang', 'es')

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Helper to get ID
    def get_lang_id(code):
        cursor.execute("SELECT language_id FROM languages WHERE language_code = %s", (code,))
        res = cursor.fetchone()
        return res['language_id'] if res else None

    src_id = get_lang_id(source_lang)
    tgt_id = get_lang_id(target_lang)

    if not src_id or not tgt_id:
        cursor.close()
        conn.close()
        # Fallback if language codes not in DB, try to run anyway but can't cache properly without IDs
        # For now, just error or default
        return jsonify({"error": "Invalid language codes provided"}), 400

    # 1. CHECK CACHE
    query = """
        SELECT output_text FROM translation_sessions 
        WHERE input_text = %s AND source_language_id = %s AND target_language_id = %s
        LIMIT 1
    """
    cursor.execute(query, (input_text, src_id, tgt_id))
    cached = cursor.fetchone()

    if cached:
        cursor.close()
        conn.close()
        return jsonify({"translated_text": cached['output_text'], "cached": True})

    # 2. TRANSLATE
    try:
        translator = GoogleTranslator(source=source_lang, target=target_lang)
        translated_text = translator.translate(input_text)

        # 3. SAVE TO DB
        cursor.execute("""
            INSERT INTO translation_sessions 
            (user_id, input_text, output_text, source_language_id, target_language_id) 
            VALUES (%s, %s, %s, %s, %s)
        """, (user_id, input_text, translated_text, src_id, tgt_id))
        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({"translated_text": translated_text, "cached": False})

    except Exception as e:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()
        return jsonify({"error": str(e)}), 500

@app.route('/api/error', methods=['POST'])
def log_error():
    data = request.json
    user_id = data.get('user_id')
    error_type = data.get('error_type')
    message = data.get('message')
    context = data.get('context')

    # Compose a combined message that includes context if provided
    full_message = message or ''
    if context:
        full_message = f"{full_message} | context: {context}"

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO error_logs (user_id, error_type, message) VALUES (%s, %s, %s)", (user_id, error_type, full_message))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"status": "logged"}), 201

if __name__ == '__main__':
    app.run(debug=True, port=5000)