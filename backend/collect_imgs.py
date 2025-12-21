import os
import mediapipe as mp
import cv2

DATA_DIR = './data'
if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)

# --- MediaPipe Setup ---
# Fix: changed .hand to .hands
mp_hands = mp.solutions.hands
mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles

# Initialize the Hands model
# static_image_mode=False is better for webcam tracking
hands = mp_hands.Hands(static_image_mode=False, min_detection_confidence=0.5, max_num_hands=2)

number_of_classes = 23 # Reduced for testing, change back to 20 when ready
dataset_size = 100

cap = cv2.VideoCapture(0)

for j in range(number_of_classes):
    class_dir = os.path.join(DATA_DIR, str(j))
    if not os.path.exists(class_dir):
        os.makedirs(class_dir)

    print(f'Collecting data for class {j}')

    # --- Phase 1: Preparation Screen ---
    while True:
        ret, frame = cap.read()
        if not ret: break

        # Process landmarks so user can align their hand
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = hands.process(frame_rgb)

        if results.multi_hand_landmarks:
            for hand_landmarks in results.multi_hand_landmarks:
                mp_drawing.draw_landmarks(
                    frame, hand_landmarks, mp_hands.HAND_CONNECTIONS,
                    mp_drawing_styles.get_default_hand_landmarks_style(),
                    mp_drawing_styles.get_default_hand_connections_style())

        cv2.putText(frame, f'Class {j}: Press "Q" to Start', (50, 50), 
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2, cv2.LINE_AA)
        cv2.imshow('GestureVox Collector', frame)
        
        if cv2.waitKey(25) == ord('q'):
            break

    # --- Phase 2: Actual Data Collection ---
    counter = 0
    while counter < dataset_size:
        ret, frame = cap.read()
        if not ret: continue

        # We process landmarks here too so you can see if the hand is detected
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = hands.process(frame_rgb)

        # Draw on the display frame
        display_frame = frame.copy()
        if results.multi_hand_landmarks:
            for hand_landmarks in results.multi_hand_landmarks:
                mp_drawing.draw_landmarks(
                    display_frame, hand_landmarks, mp_hands.HAND_CONNECTIONS,
                    mp_drawing_styles.get_default_hand_landmarks_style(),
                    mp_drawing_styles.get_default_hand_connections_style())

        # Save the ORIGINAL raw frame (without drawings) for the dataset
        cv2.imwrite(os.path.join(class_dir, f'{counter}.jpg'), frame)
        
        cv2.putText(display_frame, f'Collecting: {counter}/{dataset_size}', (50, 50), 
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 0, 0), 2, cv2.LINE_AA)
        cv2.imshow('GestureVox Collector', display_frame)
        cv2.waitKey(25)
        counter += 1

cap.release()
cv2.destroyAllWindows()
hands.close()