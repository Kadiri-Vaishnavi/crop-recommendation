# ------------------------------
# Crop Recommendation ML Project
# ------------------------------

# 1️⃣ Import Libraries
import pandas as pd
import numpy as np
import os
from sklearn.preprocessing import MinMaxScaler, LabelEncoder
from sklearn.model_selection import train_test_split, GridSearchCV, cross_val_score
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.metrics import accuracy_score, classification_report
import matplotlib.pyplot as plt

# ------------------------------
# 2️⃣ Load Dataset
# ------------------------------
# Use relative path from the script location
data_path = os.path.join(os.path.dirname(__file__), '../../data/raw/Crop_recommendation.csv')

if not os.path.exists(data_path):
    print(f"Error: Dataset not found at {data_path}")
    exit()

# Load CSV
df = pd.read_csv(data_path)

# Inspect data
print("--- Data Info ---")
print(df.head())
print(df.info())
print("\n--- Missing Values ---")
print(df.isnull().sum())

# ------------------------------
# 3️⃣ Preprocessing
# ------------------------------
numeric_features = ['N','P','K','temperature','humidity','ph','rainfall']

# Fill missing values (if any)
for col in numeric_features:
    df[col] = df[col].fillna(df[col].mean())

if 'label' in df.columns:
    df['label'] = df['label'].fillna(df['label'].mode()[0])

# Normalize features
scaler = MinMaxScaler()
df[numeric_features] = scaler.fit_transform(df[numeric_features])

# Encode target labels
le = LabelEncoder()
df['label'] = le.fit_transform(df['label'])
print("\nLabel encoding mapping:")
print(dict(zip(le.classes_, le.transform(le.classes_))))

# ------------------------------
# 4️⃣ Feature Selection
# ------------------------------
X = df[numeric_features]
y = df['label']

# Train-test split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# ------------------------------
# 5️⃣ Decision Tree Classifier
# ------------------------------
print("\n--- Training Decision Tree ---")
dt_model = DecisionTreeClassifier(random_state=42)

# Hyperparameter tuning with GridSearchCV
param_grid = {'max_depth': [None, 10, 20, 30], 'min_samples_split': [2, 5, 10]}
grid_search = GridSearchCV(estimator=dt_model, param_grid=param_grid, cv=5)
grid_search.fit(X_train, y_train)
print("Best DT parameters:", grid_search.best_params_)

# Train DT with best params
dt_best = DecisionTreeClassifier(
    max_depth=grid_search.best_params_['max_depth'],
    min_samples_split=grid_search.best_params_['min_samples_split'],
    random_state=42
)
dt_best.fit(X_train, y_train)

# Predictions
y_pred_dt = dt_best.predict(X_test)

# Evaluation
print("Decision Tree Accuracy:", accuracy_score(y_test, y_pred_dt))
print("\nDecision Tree Classification Report:\n", classification_report(y_test, y_pred_dt))

# ------------------------------
# 6️⃣ Random Forest Classifier
# ------------------------------
print("\n--- Training Random Forest ---")
rf_model = RandomForestClassifier(n_estimators=100, random_state=42)
rf_model.fit(X_train, y_train)

y_pred_rf = rf_model.predict(X_test)
print("Random Forest Accuracy:", accuracy_score(y_test, y_pred_rf))
print("\nRandom Forest Classification Report:\n", classification_report(y_test, y_pred_rf))

# ------------------------------
# 7️⃣ K-Nearest Neighbors (KNN)
# ------------------------------
print("\n--- Training KNN ---")
knn_model = KNeighborsClassifier(n_neighbors=5)
knn_model.fit(X_train, y_train)

y_pred_knn = knn_model.predict(X_test)
print("KNN Accuracy:", accuracy_score(y_test, y_pred_knn))
print("\nKNN Classification Report:\n", classification_report(y_test, y_pred_knn))

# ------------------------------
# 8️⃣ Compare Model Accuracies
# ------------------------------
models = ['Decision Tree', 'Random Forest', 'KNN']
accuracies = [accuracy_score(y_test, y_pred_dt),
              accuracy_score(y_test, y_pred_rf),
              accuracy_score(y_test, y_pred_knn)]

print("\n--- Accuracy Comparison ---")
for name, acc in zip(models, accuracies):
    print(f"{name}: {acc:.4f}")

# ------------------------------
# 9️⃣ Cross-Validation Scores
# ------------------------------
print("\n--- Cross-Validation ---")
for model, name in zip([dt_best, rf_model, knn_model], models):
    cv_scores = cross_val_score(model, X, y, cv=5)
    print(f"{name} CV Mean Accuracy: {cv_scores.mean():.4f}")

# ------------------------------
# 🔟 Prediction Interface
# ------------------------------
print("\n--- Manual Prediction Interface ---")
try:
    # Use explicit input prompts
    N = float(input("Enter Nitrogen (N) value: "))
    P = float(input("Enter Phosphorus (P) value: "))
    K = float(input("Enter Potassium (K) value: "))
    temp = float(input("Enter temperature: "))
    hum = float(input("Enter humidity: "))
    ph_val = float(input("Enter pH: "))
    rain = float(input("Enter rainfall: "))

    new_sample = pd.DataFrame([{
        'N': N, 'P': P, 'K': K,
        'temperature': temp,
        'humidity': hum,
        'ph': ph_val,
        'rainfall': rain
    }])

    new_sample[numeric_features] = scaler.transform(new_sample[numeric_features])
    pred_label_encoded = rf_model.predict(new_sample) # Using RF as it's the best
    pred_label = le.inverse_transform(pred_label_encoded)
    print(f"\nRecommended crop: {pred_label[0].upper()}")
except Exception as e:
    print(f"Error during manual prediction: {e}")
