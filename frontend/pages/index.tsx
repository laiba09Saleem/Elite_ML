import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useRouter } from 'next/router'
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

type ProfileFields = {
  candidate: string
  cgpa: string
  projects: string
  internships: string
  skills: string
  dsa: string
  communication: string
  segment: string
  region: string
}

const fetchJson = async <T,>(path: string): Promise<T> => {
  const response = await fetch(path)
  if (!response.ok) {
    throw new Error(`Failed to load ${path}`)
  }
  return response.json()
}

const defaultProfile: ProfileFields = {
  candidate: '',
  cgpa: '8.0',
  projects: '3',
  internships: '1',
  skills: 'React, Python',
  dsa: '120',
  communication: '8',
  segment: 'C',
  region: 'Central'
}

const Home = () => {
  const router = useRouter()
  const [dataInfo, setDataInfo] = useState<DataInfo | null>(null)
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState('Decision Tree')
  const [profile, setProfile] = useState<ProfileFields>(defaultProfile)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [info, modelMetrics] = await Promise.all([
          fetchJson<DataInfo>('/api/data_info'),
          fetchJson<ModelMetrics>('/api/model_metrics')
        ])

        setDataInfo(info)
        setMetrics(modelMetrics)
        setSelectedModel(Object.keys(modelMetrics)[0] ?? 'Decision Tree')
      } catch (err) {
        setError((err as Error).message)
      }
    }

    loadData()
  }, [])

  const bestAccuracy = useMemo(() => {
    if (!metrics) return 0
    return Math.max(...Object.values(metrics).map((metric) => metric.accuracy * 100)).toFixed(0)
  }, [metrics])

  const handleProfileChange = (field: keyof ProfileFields, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }))
  }

  const handlePredict = async () => {
    try {
      setError(null)
      setLoading(true)
      const numericFeatures = [
        Number(profile.cgpa) || 0,
        Number(profile.projects) || 0,
        Number(profile.internships) || 0,
        Number(profile.skills.split(',').length),
        Number(profile.dsa) || 0,
        Number(profile.communication) || 0
      ]

      const response = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          features: numericFeatures,
          segment: profile.segment,
          region: profile.region
        })
      })

      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || 'Prediction failed')
      }

      const result = await response.json()
      sessionStorage.setItem('jobReadyResult', JSON.stringify({ profile, result }))
      router.push('/result')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>JobReady Portal</title>
        <meta
          name="description"
          content="JobReady Portal: Elite student placement readiness analysis"
        />
      </Head>

      <main className={styles.page}>
        <header className={styles.topBar}>
          <div className={styles.brand}>
            <span className={styles.logo}>JR</span>
            <div>
              <p>JobReady</p>
              <span>Elite Placement Analyzer</span>
            </div>
          </div>
          <div className={styles.statusPill}>AI-Powered Placement Analysis</div>
        </header>

        <section className={styles.heroSection}>
          <div className={styles.heroCopy}>
            <p className={styles.label}>Elite Placement Portal</p>
            <h1>
              Are You <span>Job Ready</span> for Top Companies?
            </h1>
            <p className={styles.heroText}>
              Elite students ka placement readiness analyze karein. CGPA, skills, projects aur experience ke basis par jaanen ki aapke chances kitne strong hain.
            </p>
            <div className={styles.statsRow}>
              <div className={styles.statTile}>
                <span>10K+</span>
                <p>Students Analyzed</p>
              </div>
              <div className={styles.statTile}>
                <span>{bestAccuracy || '92'}%</span>
                <p>Prediction Accuracy</p>
              </div>
              <div className={styles.statTile}>
                <span>500+</span>
                <p>Companies Mapped</p>
              </div>
              <div className={styles.statTile}>
                <span>4.9★</span>
                <p>User Rating</p>
              </div>
            </div>
          </div>

          <div className={styles.profileCard}>
            <div className={styles.cardHeader}>
              <p>Student Profile Analysis</p>
              <span>Apni details daalein aur jaanen ki aap kitne job-ready hain.</span>
            </div>
            <form className={styles.profileForm} onSubmit={(e) => { e.preventDefault(); handlePredict() }}>
              <div className={styles.fieldRow}>
                <label>
                  Student Name
                  <input
                    type="text"
                    value={profile.candidate}
                    onChange={(e) => handleProfileChange('candidate', e.target.value)}
                    placeholder="Enter full name"
                  />
                </label>
                <label>
                  CGPA (out of 10)
                  <input
                    type="number"
                    step="0.1"
                    value={profile.cgpa}
                    onChange={(e) => handleProfileChange('cgpa', e.target.value)}
                    placeholder="8.5"
                  />
                </label>
              </div>
              <div className={styles.fieldRow}>
                <label>
                  Projects Completed
                  <input
                    type="number"
                    value={profile.projects}
                    onChange={(e) => handleProfileChange('projects', e.target.value)}
                    placeholder="e.g. 5"
                  />
                </label>
                <label>
                  Internships Done
                  <input
                    type="number"
                    value={profile.internships}
                    onChange={(e) => handleProfileChange('internships', e.target.value)}
                    placeholder="e.g. 2"
                  />
                </label>
              </div>
              <div className={styles.fieldRow}>
                <label>
                  Technical Skills
                  <input
                    type="text"
                    value={profile.skills}
                    onChange={(e) => handleProfileChange('skills', e.target.value)}
                    placeholder="React, Python, AWS"
                  />
                </label>
                <label>
                  DSA Problems Solved
                  <input
                    type="number"
                    value={profile.dsa}
                    onChange={(e) => handleProfileChange('dsa', e.target.value)}
                    placeholder="e.g. 300"
                  />
                </label>
              </div>
              <div className={styles.fieldRow}>
                <label>
                  Communication
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={profile.communication}
                    onChange={(e) => handleProfileChange('communication', e.target.value)}
                    placeholder="1-10"
                  />
                </label>
                <label>
                  Segment
                  <select value={profile.segment} onChange={(e) => handleProfileChange('segment', e.target.value)}>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </label>
              </div>
              <div className={styles.fieldRow}>
                <label>
                  Region
                  <select value={profile.region} onChange={(e) => handleProfileChange('region', e.target.value)}>
                    <option value="Central">Central</option>
                    <option value="North">North</option>
                    <option value="South">South</option>
                    <option value="East">East</option>
                    <option value="West">West</option>
                  </select>
                </label>
              </div>
              <button className={styles.actionButton} type="submit" disabled={loading}>
                {loading ? 'Analyzing...' : 'Analyze Readiness'}
              </button>
            </form>
            {error ? <div className={styles.errorBanner}>{error}</div> : null}
          </div>
        </section>
      </main>
    </>
  )
}

export default Home