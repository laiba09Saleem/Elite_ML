import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useRouter } from 'next/router'
import styles from '../styles/Home.module.css'

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
}

type StoredResult = {
  profile: ProfileFields
  result: PredictionResult
}

const ResultPage = () => {
  const router = useRouter()
  const [stored, setStored] = useState<StoredResult | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = sessionStorage.getItem('jobReadyResult')
    if (!raw) {
      router.replace('/')
      return
    }

    try {
      setStored(JSON.parse(raw) as StoredResult)
    } catch {
      router.replace('/')
    }
  }, [router])

  const readinessPercent = useMemo(() => {
    if (!stored) return 0
    return Math.round((stored.result.probability[1] ?? 0) * 100)
  }, [stored])

  const readinessLabel = stored
    ? stored.result.prediction === 1
      ? 'Elite Ready'
      : 'Needs Improvement'
    : 'Loading'

  const improvementTip = stored
    ? readinessPercent >= 70
      ? 'Strong profile. Focus on mock interviews and networking to convert this into a top-tier placement.'
      : 'Improve CGPA, projects and DSA performance to raise your placement readiness score.'
    : 'Gathering your prediction details...'

  return (
    <>
      <Head>
        <title>JobReady Result</title>
        <meta
          name="description"
          content="JobReady placement prediction result"
        />
      </Head>

      <main className={styles.page}>
        <header className={styles.topBar}>
          <div className={styles.brand}>
            <span className={styles.logo}>JR</span>
            <div>
              <p>JobReady</p>
              <span>Prediction Result</span>
            </div>
          </div>
          <Link href="/" className={styles.secondaryButton}>
            Analyze Another Student
          </Link>
        </header>

        <section className={styles.analysisSection}>
          <div className={styles.analysisCard}>
            <div className={styles.analysisHeader}>
              <span>Result for</span>
              <h2>{stored?.profile.candidate || 'Student Candidate'}</h2>
            </div>
            <div className={styles.progressRing}>
              <div className={styles.progressCircle} style={{ '--percent': `${readinessPercent}%` } as CSSProperties}>
                <span>{readinessPercent}%</span>
              </div>
            </div>
            <div className={styles.scoreBadge}>{readinessLabel}</div>
            <p className={styles.analysisText}>
              Backend model used: {stored?.result.model_used || 'Loading...'}
            </p>
            <div className={styles.metricsRow}>
              <div className={styles.metricBlock}>
                <strong>{stored?.profile.cgpa || '8.0'}</strong>
                <p>CGPA</p>
              </div>
              <div className={styles.metricBlock}>
                <strong>{stored?.profile.dsa || '120'}</strong>
                <p>DSA Solved</p>
              </div>
              <div className={styles.metricBlock}>
                <strong>{stored?.profile.projects || '3'}</strong>
                <p>Projects</p>
              </div>
              <div className={styles.metricBlock}>
                <strong>{stored?.profile.internships || '1'}</strong>
                <p>Internships</p>
              </div>
            </div>
          </div>

          <div className={styles.tipsCard}>
            <h3>Improvement Tips</h3>
            <p>{improvementTip}</p>
            <div className={styles.detailList}>
              <div className={styles.detailItem}>
                <strong>Skills</strong>
                <span>{stored?.profile.skills || 'Not specified'}</span>
              </div>
              <div className={styles.detailItem}>
                <strong>Communication</strong>
                <span>{stored?.profile.communication || 'Not specified'}</span>
              </div>
              <div className={styles.detailItem}>
                <strong>Model</strong>
                <span>{stored?.result.model_used || 'JobReady Heuristic'}</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}

export default ResultPage
