import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import './CareersPage.css';

const HERO_IMAGE = 'https://static.wixstatic.com/media/9d31c9_33551de5580a4b118328c6368cfe0c6f~mv2.jpg/v1/fill/w_1340,h_656,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/9d31c9_33551de5580a4b118328c6368cfe0c6f~mv2.jpg';

const CACHE_KEY = 'pydah_careers_openings';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Load cached data immediately
const loadCachedData = () => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      const now = Date.now();
      // Return cached data if it's less than 5 minutes old
      if (now - timestamp < CACHE_DURATION) {
        return data;
      }
    }
  } catch (err) {
    console.error('Error loading cached data:', err);
  }
  return null;
};

// Save data to cache
const saveToCache = (data) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (err) {
    console.error('Error saving to cache:', err);
  }
};

const CareersPage = () => {
  // Initialize with cached data if available for instant display
  const cachedData = useMemo(() => loadCachedData(), []);
  const [forms, setForms] = useState(cachedData || { teaching: [], nonTeaching: [] });
  const [activeTab, setActiveTab] = useState('teaching');
  const [loading, setLoading] = useState(!cachedData); // Only show loading if no cache
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchForms = async () => {
      try {
        const response = await api.get('/forms/public/active');
        const newForms = {
          teaching: response.data?.teaching || [],
          nonTeaching: response.data?.nonTeaching || []
        };
        setForms(newForms);
        saveToCache(newForms); // Cache the fresh data
        setError(''); // Clear any previous errors
      } catch (err) {
        console.error('Error fetching forms:', err);
        // Only set error if we don't have cached data to show
        if (!cachedData) {
          setError('Unable to load current openings. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };

    // Always fetch fresh data, but don't block UI if we have cache
    fetchForms();
  }, [cachedData]);

  const currentForms = useMemo(() => {
    return activeTab === 'teaching' ? forms.teaching : forms.nonTeaching;
  }, [activeTab, forms.teaching, forms.nonTeaching]);

  const formatDate = (value) => {
    if (!value) return 'Open until filled';
    try {
      return new Date(value).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (err) {
      return 'Open until filled';
    }
  };

  const buildSubtitle = (form) => {
    const requirements = form.requirements || {};

    let subtitle = form.description || '';

    if (!subtitle && Array.isArray(requirements.qualifications) && requirements.qualifications.length > 0) {
      subtitle = requirements.qualifications.join(', ');
    }

    if (!subtitle && requirements.experience?.preferred) {
      subtitle = requirements.experience.preferred;
    }

    if (!subtitle && Array.isArray(requirements.skills) && requirements.skills.length > 0) {
      subtitle = requirements.skills.join(', ');
    }

    if (!subtitle && form.department) {
      subtitle = form.department;
    }

    return subtitle || '';
  };

  return (
    <div className="careers-page">
      <section className="careers-hero" style={{ backgroundImage: `url(${HERO_IMAGE})` }}>
        <div className="careers-hero-content">
          <p className="careers-eyebrow">Pydah Group of Institutions</p>
          <h1>Shape the Future With Us</h1>
          <p className="careers-hero-text">
            Explore exciting career opportunities with our vibrant academic community. We are committed
            to fostering innovation, nurturing talent, and empowering the next generation of leaders.
          </p>
          <div className="careers-hero-actions">
            <a href="#openings" className="careers-primary-button">Explore Openings</a>
            <Link to="/login" className="careers-secondary-link">Admin Login</Link>
          </div>
        </div>
      </section>

      <div className="careers-body">
        <section id="openings" className="careers-openings">
          <header>
            <div>
              <h3>Current Openings</h3>
              <p className="careers-openings-copy">
                Discover the latest roles across our institutions. Choose a category to explore openings and apply directly.
              </p>
            </div>
            <div className="careers-tabs">
              <button
                type="button"
                className={`careers-tab ${activeTab === 'teaching' ? 'active' : ''}`}
                onClick={() => setActiveTab('teaching')}
              >
                Teaching
              </button>
              <button
                type="button"
                className={`careers-tab ${activeTab === 'nonTeaching' ? 'active' : ''}`}
                onClick={() => setActiveTab('nonTeaching')}
              >
                Non Teaching
              </button>
            </div>
          </header>

          {loading && (
            <div className="careers-status">Loading current openings...</div>
          )}

          {!loading && error && (
            <div className="careers-status error">{error}</div>
          )}

          {!loading && !error && currentForms.length === 0 && (
            <div className="careers-status">No active positions available right now. Please check back soon.</div>
          )}

          <div className="careers-job-list">
            {currentForms.map((form) => {
              const subtitle = buildSubtitle(form);

              return (
                <article key={form.id} className="careers-job">
                  <div className="careers-job-info">
                    <h3>{form.title || form.position}</h3>
                    {subtitle && (
                      <p className="careers-job-subtitle">{subtitle}</p>
                    )}
                    <div className="careers-job-meta">
                      {form.department && <span>{form.department}</span>}
                      {form.position && !form.title && <span>{form.position}</span>}
                      {form.vacancies !== undefined && form.vacancies !== null && (
                        <span>
                          {form.vacancies} {form.vacancies === 1 ? 'Vacancy' : 'Vacancies'}
                        </span>
                      )}
                      <span>{formatDate(form.closingDate)}</span>
                    </div>
                  </div>
                  <div className="careers-job-actions">
                    <Link
                      className="careers-apply-button"
                      to={`/form/${form.uniqueLink}`}
                    >
                      Apply Now
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};

export default CareersPage;

