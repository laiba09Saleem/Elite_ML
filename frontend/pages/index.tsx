import Head from 'next/head'
import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import styles from '../styles/Home.module.css'

type DataInfo = {
  shape: number[]
  missing_values: number
  class_distribution: Record<string, number>
  features: number
  categorical_cols: string[]
}

type ModelMetric = {
  accuracy: number
  precision: number
  recall: number
  f1: number
  confusion_matrix: number[][]
  roc_auc?: number
}

type ModelMetrics = Record<string, ModelMetric>

type PredictionResult = {
  prediction: number
  probability: number[]
  model_used: string
}

type ApiResponse<T> = T

const fetchJson = async <T,>(path: string): Promise<T> => {
  const response = await fetch(path)
  if (!response.ok) {
    throw new Error(`Failed to load ${path}`)
  }
  return response.json()
}

const Home = () => {
  const [dataInfo, setDataInfo] = useState<DataInfo | null>(null)
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState('Decision Tree')
  const [predictionValues, setPredictionValues] = useState<number[]>([])
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [info, modelMetrics] = await Promise.all([
          fetchJson<DataInfo>('/api/data_info'),
          fetchJson<ModelMetrics>('/api/model_metrics')
        ])

        setDataInfo(info)
        setMetrics(modelMetrics)
        setPredictionValues(Array(info.features).fill(0))
        setSelectedModel(Object.keys(modelMetrics)[0] ?? 'Decision Tree')
      } catch (err) {
        setError((err as Error).message)
      }
    }

    loadData()
  }, [])

  const metricChartData = useMemo(() => {
    if (!metrics) return []
    return Object.entries(metrics).map(([name, metric]) => ({
      name,
      accuracy: Number((metric.accuracy * 100).toFixed(1))
    }))
  }, [metrics])

  const classDistributionData = useMemo(() => {
    if (!dataInfo) return []
    return Object.entries(dataInfo.class_distribution).map(([label, value]) => ({
      label,
      value
    }))
  }, [dataInfo])

  const handleFeatureChange = (index: number, value: string) => {
    const updated = [...predictionValues]
    updated[index] = Number(value)
    setPredictionValues(updated)
  }

  const handlePredict = async () => {
    try {
      setError(null)
      setLoading(true)
      setPredictionResult(null)
      const response = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: selectedModel, features: predictionValues })
      })

      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || 'Prediction failed')
      }

      const result = await response.json()
      setPredictionResult(result)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>Elite ML Dashboard</title>
        <meta
          name="description"
          content="Next.js dashboard for the Elite ML Flask backend"
        />
      </Head>

      <main className={styles.page}>
        <section className={styles.hero}>
          <div>
            <p className={styles.slab}>Elite ML Dashboard</p>
            <h1>Modern analytics UI for your Flask backend</h1>
            <p>
              A responsive Next.js frontend that consumes Flask API endpoints and
              provides dataset insights, model metrics, and live predictions.
            </p>
          </div>
          <div className={styles.quickStats}>
            <div className={styles.statCard}>
              <span>Features</span>
              <strong>{dataInfo?.features ?? '—'}</strong>
            </div>
            <div className={styles.statCard}>
              <span>Missing values</span>
              <strong>{dataInfo?.missing_values ?? '—'}</strong>
            </div>
            <div className={styles.statCard}>
              <span>Records</span>
              <strong>{dataInfo?.shape?.[0] ?? '—'}</strong>
            </div>
          </div>
        </section>

        {error ? <div className={styles.errorBanner}>{error}</div> : null}

        <section className={styles.gridSection}>
          <article className={styles.card}>
            <h2>Model accuracy comparison</h2>
            <p>Visualize all model accuracies from the backend evaluation.</p>
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={metricChartData} margin={{ top: 16, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => `${value}%`} />
                  <Tooltip formatter={(value: number) => `${value}%`} />
                  <Bar dataKey="accuracy" fill="#2563eb" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className={styles.card}>
            <h2>Class distribution</h2>
            <p>Review the target balance for the dataset.</p>
            <div className={styles.distributionList}>
              {classDistributionData.map((item) => (
                <div key={item.label} className={styles.distributionItem}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className={styles.gridSection}>
          <article className={styles.card}>
            <h2>Model metrics</h2>
            <div className={styles.tableWrapper}>
              <table className={styles.metricTable}>
                <thead>
                  <tr>
                    <th>Model</th>
                    <th>Accuracy</th>
                    <th>Precision</th>
                    <th>Recall</th>
                    <th>F1</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics
                    ? Object.entries(metrics).map(([name, metric]) => (
                        <tr key={name}>
                          <td>{name}</td>
                          <td>{(metric.accuracy * 100).toFixed(1)}%</td>
                          <td>{metric.precision.toFixed(2)}</td>
                          <td>{metric.recall.toFixed(2)}</td>
                          <td>{metric.f1.toFixed(2)}</td>
                        </tr>
                      ))
                    : null}
                </tbody>
              </table>
            </div>
          </article>

          <article className={styles.card}>
            <h2>Make a prediction</h2>
            <p>Send a feature vector to the selected model and get a live prediction.</p>
            <div className={styles.formGroup}>
              <label htmlFor="model">Model</label>
              <select id="model" value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
                {metrics ? Object.keys(metrics).map((model) => <option key={model}>{model}</option>) : null}
              </select>
            </div>
            <div className={styles.featureGrid}>
              {predictionValues.map((value, index) => (
                <div key={index} className={styles.featureItem}>
                  <label htmlFor={`feature-${index}`}>F{index + 1}</label>
                  <input
                    id={`feature-${index}`}
                    type="number"
                    step="0.01"
                    value={value}
                    onChange={(event) => handleFeatureChange(index, event.target.value)}
                  />
                </div>
              ))}
            </div>
            <button className={styles.predictButton} onClick={handlePredict} disabled={loading || predictionValues.length === 0}>
              {loading ? 'Predicting…' : 'Predict now'}
            </button>
            {predictionResult ? (
              <div className={styles.resultBox}>
                <p>
                  <strong>Prediction:</strong> {predictionResult.prediction}
                </p>
                <p>
                  <strong>Model:</strong> {predictionResult.model_used}
                </p>
                <p>
                  <strong>Probability:</strong> {predictionResult.probability.map((value, idx) => `Class ${idx}: ${value.toFixed(3)}`).join(' | ')}
                </p>
              </div>
            ) : null}
          </article>
        </section>
      </main>
    </>
  )
}

export default Home
