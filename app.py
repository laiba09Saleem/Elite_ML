from flask import Flask, request, jsonify
import pandas as pd
import numpy as np
import json
import base64
from io import BytesIO
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split, GridSearchCV, learning_curve
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.tree import DecisionTreeClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.svm import SVC
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix, roc_auc_score, roc_curve
from sklearn.decomposition import PCA
import warnings
warnings.filterwarnings('ignore')

app = Flask(__name__)

# Global variables to store trained models and data
models = {}
scaler = None
label_encoders = {}
feature_cols = []
X_train, X_test, y_train, y_test = None, None, None, None
X_scaled = None
df_clean = None

def load_and_preprocess_data():
    global df_clean, scaler, label_encoders, feature_cols
    global X_train, X_test, y_train, y_test, X_scaled, models
    
    # Load data
    df = pd.read_csv('elite_dataset.csv')
    
    # Handle missing values
    numeric_cols = [col for col in df.columns if col.startswith('feature_')]
    if numeric_cols:
        df[numeric_cols] = df[numeric_cols].fillna(df[numeric_cols].median())

    # Handle missing categorical values
    for cat_col in ['segment', 'region']:
        if cat_col in df.columns:
            df[cat_col].fillna(df[cat_col].mode().iloc[0] if not df[cat_col].mode().empty else 'Unknown', inplace=True)

    # Drop rows with missing target or any remaining NaNs
    if 'target' in df.columns:
        df = df.dropna(subset=['target'])
    df = df.dropna()

    # Encode categorical variables
    le_segment = LabelEncoder()
    le_region = LabelEncoder()
    df['segment_encoded'] = le_segment.fit_transform(df['segment'])
    df['region_encoded'] = le_region.fit_transform(df['region'])
    label_encoders['segment'] = le_segment
    label_encoders['region'] = le_region
    
    # Prepare features
    feature_cols = numeric_cols + ['segment_encoded', 'region_encoded']
    X = df[feature_cols]
    y = df['target']
    df_clean = df
    
    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Train all models with best parameters
    # Decision Tree
    dt = DecisionTreeClassifier(max_depth=7, min_samples_split=5, min_samples_leaf=2, random_state=42)
    dt.fit(X_train, y_train)
    
    # KNN
    knn = KNeighborsClassifier(n_neighbors=7, weights='distance', metric='euclidean')
    knn.fit(X_train, y_train)
    
    # SVM
    svm = SVC(C=10, kernel='rbf', gamma='scale', probability=True, random_state=42)
    svm.fit(X_train, y_train)
    
    models = {
        'Decision Tree': dt,
        'KNN': knn,
        'SVM': svm
    }
    
    return True

def get_model_metrics(model, name):
    """Calculate all metrics for a model"""
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1] if hasattr(model, 'predict_proba') else None
    
    metrics = {
        'accuracy': accuracy_score(y_test, y_pred),
        'precision': precision_score(y_test, y_pred),
        'recall': recall_score(y_test, y_pred),
        'f1': f1_score(y_test, y_pred),
        'confusion_matrix': confusion_matrix(y_test, y_pred).tolist()
    }
    
    if y_proba is not None:
        metrics['roc_auc'] = roc_auc_score(y_test, y_proba)
        fpr, tpr, _ = roc_curve(y_test, y_proba)
        metrics['roc_curve'] = {'fpr': fpr.tolist(), 'tpr': tpr.tolist()}
    
    return metrics

def get_learning_curve_data(model, name):
    """Generate learning curve data"""
    train_sizes, train_scores, test_scores = learning_curve(
        model, X_train, y_train, cv=5, n_jobs=-1,
        train_sizes=np.linspace(0.1, 1.0, 8),
        scoring='accuracy'
    )
    
    return {
        'train_sizes': train_sizes.tolist(),
        'train_mean': np.mean(train_scores, axis=1).tolist(),
        'train_std': np.std(train_scores, axis=1).tolist(),
        'test_mean': np.mean(test_scores, axis=1).tolist(),
        'test_std': np.std(test_scores, axis=1).tolist()
    }

@app.route('/')
def index():
    return jsonify({
        'message': 'This Flask app serves only API endpoints. Use the Next.js frontend at http://localhost:3000.',
        'api_endpoints': ['/api/data_info', '/api/model_metrics', '/api/learning_curves', '/api/feature_importance', '/api/pca_visualization', '/api/categorical_analysis', '/api/distributions', '/api/predict']
    })

@app.route('/api/data_info')
def data_info():
    """Return basic information about the dataset"""
    global df_clean
    
    class_counts = df_clean['target'].value_counts().to_dict()
    class_distribution = {str(label): int(count) for label, count in class_counts.items()}

    info = {
        'shape': df_clean.shape,
        'missing_values': int(df_clean.isnull().sum().sum()),
        'class_distribution': class_distribution,
        'features': len([col for col in df_clean.columns if col.startswith('feature_')]),
        'categorical_cols': ['segment', 'region']
    }
    return jsonify(info)

@app.route('/api/backend_info')
def backend_info():
    """Return backend dataset and model configuration details"""
    global df_clean, feature_cols, models, label_encoders

    class_counts = df_clean['target'].value_counts().to_dict()
    class_distribution = {str(label): int(count) for label, count in class_counts.items()}

    dataset_info = {
        'row_count': int(df_clean.shape[0]),
        'column_count': int(df_clean.shape[1]),
        'feature_columns': feature_cols,
        'numeric_features': [col for col in feature_cols if col.startswith('feature_')],
        'categorical_features': [col for col in feature_cols if col.endswith('_encoded')],
        'target_name': 'target',
        'target_distribution': class_distribution,
        'label_encoders': {
            'segment': label_encoders['segment'].classes_.tolist() if 'segment' in label_encoders else [],
            'region': label_encoders['region'].classes_.tolist() if 'region' in label_encoders else []
        }
    }

    model_info = {}
    for name, model in models.items():
        params = {}
        if name == 'Decision Tree':
            params = {
                'max_depth': model.get_params().get('max_depth'),
                'min_samples_split': model.get_params().get('min_samples_split'),
                'min_samples_leaf': model.get_params().get('min_samples_leaf'),
                'random_state': model.get_params().get('random_state')
            }
        elif name == 'KNN':
            params = {
                'n_neighbors': model.get_params().get('n_neighbors'),
                'weights': model.get_params().get('weights'),
                'metric': model.get_params().get('metric')
            }
        elif name == 'SVM':
            params = {
                'C': model.get_params().get('C'),
                'kernel': model.get_params().get('kernel'),
                'gamma': model.get_params().get('gamma'),
                'probability': model.get_params().get('probability')
            }
        else:
            params = model.get_params()

        model_info[name] = {
            'class': model.__class__.__name__,
            'params': params
        }

    return jsonify({
        'dataset': dataset_info,
        'models': model_info
    })

@app.route('/api/model_metrics')
def model_metrics():
    """Return metrics for all models"""
    results = {}
    for name, model in models.items():
        results[name] = get_model_metrics(model, name)
    return jsonify(results)

@app.route('/api/learning_curves')
def learning_curves():
    """Return learning curve data for all models"""
    results = {}
    for name, model in models.items():
        results[name] = get_learning_curve_data(model, name)
    return jsonify(results)

@app.route('/api/feature_importance')
def feature_importance():
    """Get feature importance from Decision Tree"""
    dt_model = models['Decision Tree']
    importance = dt_model.feature_importances_.tolist()
    
    # Get feature names (simplified)
    feature_names = [f'F{i}' for i in range(len(importance))]
    
    return jsonify({
        'features': feature_names[:15],  # Top 15 features
        'importance': importance[:15]
    })

@app.route('/api/pca_visualization')
def pca_visualization():
    """Get PCA transformed data for visualization"""
    global X_scaled, df_clean
    
    pca = PCA(n_components=2)
    X_pca = pca.fit_transform(X_scaled)
    
    # Sample for performance (take first 500 points if too many)
    if len(X_pca) > 1000:
        indices = np.random.choice(len(X_pca), 1000, replace=False)
        X_pca = X_pca[indices]
        y_sample = df_clean['target'].iloc[indices].tolist()
    else:
        y_sample = df_clean['target'].tolist()
    
    return jsonify({
        'pca_points': X_pca.tolist(),
        'targets': y_sample,
        'explained_variance': pca.explained_variance_ratio_.tolist()
    })

@app.route('/api/categorical_analysis')
def categorical_analysis():
    """Analyze categorical variables vs target"""
    global df_clean
    
    segment_target = df_clean.groupby('segment')['target'].value_counts(normalize=True).unstack().fillna(0)
    region_target = df_clean.groupby('region')['target'].value_counts(normalize=True).unstack().fillna(0)
    
    return jsonify({
        'segment': {
            'categories': segment_target.index.tolist(),
            'class_0': segment_target[0].tolist() if 0 in segment_target else [0]*len(segment_target),
            'class_1': segment_target[1].tolist() if 1 in segment_target else [0]*len(segment_target)
        },
        'region': {
            'categories': region_target.index.tolist(),
            'class_0': region_target[0].tolist() if 0 in region_target else [0]*len(region_target),
            'class_1': region_target[1].tolist() if 1 in region_target else [0]*len(region_target)
        }
    })

@app.route('/api/distributions')
def distributions():
    """Get distribution data for first few features"""
    global df_clean
    
    distributions = {}
    for i in range(min(6, len([col for col in df_clean.columns if col.startswith('feature_')]))):
        col = f'feature_{i}'
        hist, bins = np.histogram(df_clean[col].dropna(), bins=30)
        distributions[col] = {
            'hist': hist.tolist(),
            'bins': bins.tolist()
        }
    
    return jsonify(distributions)

@app.route('/api/predict', methods=['POST'])
def predict():
    """Make prediction for user input"""
    data = request.json or {}

    num_numeric = max(len(feature_cols) - 2, 0)
    raw_features = data.get('features', [])
    if not isinstance(raw_features, list):
        raw_features = []

    if len(raw_features) < num_numeric:
        raw_features = raw_features + [0] * (num_numeric - len(raw_features))
    raw_features = raw_features[:num_numeric]
    raw_features = [float(x) if x is not None else 0.0 for x in raw_features]

    segment = data.get('segment')
    region = data.get('region')

    try:
        seg_val = int(label_encoders['segment'].transform([segment if segment in label_encoders['segment'].classes_ else label_encoders['segment'].classes_[0]])[0])
    except Exception:
        seg_val = 0

    try:
        reg_val = int(label_encoders['region'].transform([region if region in label_encoders['region'].classes_ else label_encoders['region'].classes_[0]])[0])
    except Exception:
        reg_val = 0

    features = raw_features + [seg_val, reg_val]

    # Scale features
    features_scaled = scaler.transform([features])

    model_name = data.get('model', 'Decision Tree')
    model = models.get(model_name)

    if model:
        prediction = model.predict(features_scaled)[0]
        probability = model.predict_proba(features_scaled)[0].tolist() if hasattr(model, 'predict_proba') else [0, 0]

        return jsonify({
            'prediction': int(prediction),
            'probability': probability,
            'model_used': model_name
        })

    return jsonify({'error': 'Model not found'}), 400

if __name__ == '__main__':
    print("Loading data and training models...")
    load_and_preprocess_data()
    print("Models trained successfully!")
    print("Starting Flask server at http://127.0.0.1:5000")
    app.run(debug=True)