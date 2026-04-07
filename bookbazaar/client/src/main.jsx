import React from 'react'
import ReactDOM from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import App from './App.jsx'
import './index.css'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_KEY || 'pk_test_TYooMQauvdEDq54NiTphI7jx');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <Elements stripe={stripePromise}>
        <App />
      </Elements>
    </HelmetProvider>
  </React.StrictMode>,
)
