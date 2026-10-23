/**
 * PerformanceTrendChart.jsx
 * Line chart showing a student's score breakdown across all features.
 * Uses Chart.js radar or bar chart depending on data.
 */
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const FEATURE_LABELS = {
  attendance_pct:   'Attendance',
  assignment_score: 'Assignments',
  quiz_score:       'Quizzes',
  midterm_marks:    'Midterm',
  internal_marks:   'Internal',
  lab_marks:        'Lab',
};

const PerformanceTrendChart = ({ features = {} }) => {
  const keys   = Object.keys(FEATURE_LABELS);
  const labels = keys.map(k => FEATURE_LABELS[k]);
  const values = keys.map(k => Number(features[k] || 0));

  const backgroundColors = values.map(v =>
    v >= 75 ? 'rgba(34,197,94,0.7)' :
    v >= 50 ? 'rgba(245,158,11,0.7)' :
    'rgba(239,68,68,0.7)'
  );

  const data = {
    labels,
    datasets: [{
      label: 'Score (%)',
      data: values,
      backgroundColor: backgroundColors,
      borderColor: backgroundColors.map(c => c.replace('0.7', '1')),
      borderWidth: 1.5,
      borderRadius: 6,
    }],
  };

  const options = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: { font: { size: 11 } },
        grid: { color: '#F1F5F9' },
      },
      x: {
        ticks: { font: { size: 11, weight: '600' } },
        grid: { display: false },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => ` ${ctx.parsed.y.toFixed(1)}%`,
        },
      },
    },
  };

  return <Bar data={data} options={options} />;
};

export default PerformanceTrendChart;
