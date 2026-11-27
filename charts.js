/**
 * Charts - Chart.js wrappers for MCA Dashboard
 */
const Charts = {
  _instances: {},

  destroy(id) {
    if (this._instances[id]) {
      this._instances[id].destroy();
      delete this._instances[id];
    }
  },

  quizPerformance(canvasId, quizzes) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    this.destroy(canvasId);
    const labels = quizzes.map(q => q.title);
    const data = quizzes.map(q => Math.round((q.marksObtained / q.maxMarks) * 100 * 100)/100);
    const colors = quizzes.map((_, i) => ['#c8102e','#9f1239','#f43f5e','#f59e0b'][i % 4]);

    this._instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Quiz %',
          data,
          backgroundColor: colors.map(c => c + '18'),
          borderColor: colors,
          borderWidth: 2,
          borderRadius: 10,
          barThickness: 28
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (c) => ` ${c.parsed.y}%` } }
        },
        scales: {
          y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' }, grid: { color: 'rgba(148,163,184,0.15)' } },
          x: { grid: { display: false } }
        }
      }
    });
  },

  attendanceChart(canvasId, attendanceList, subjects) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    this.destroy(canvasId);
    const labels = attendanceList.map(a => {
      const s = subjects.find(x => x.id === a.subjectId);
      return s ? s.code : 'Sub ' + a.subjectId;
    });
    const data = attendanceList.map(a => a.percentage || Math.round((a.attendedClasses / a.totalClasses)*100*100)/100);
    this._instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Attendance %',
          data,
          backgroundColor: data.map(v => v >= 75 ? 'rgba(16,185,129,0.16)' : 'rgba(239,68,68,0.16)'),
          borderColor: data.map(v => v >= 75 ? '#10b981' : '#ef4444'),
          borderWidth: 2, borderRadius: 10
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          annotation: { display: false }
        },
        scales: {
          x: { max: 100, ticks: { callback: v => v + '%' }, grid: { color: 'rgba(148,163,184,0.15)' } },
          y: { grid: { display: false } }
        }
      }
    });
  },

  sgpaTrend(canvasId, semesterData) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    this.destroy(canvasId);
    const labels = semesterData.map(d => 'Sem ' + d.semester);
    const data = semesterData.map(d => d.sgpa);
    this._instances[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'SGPA',
          data,
          borderColor: '#c8102e',
          backgroundColor: 'rgba(200,16,46,0.08)',
          fill: true, tension: 0.4, pointRadius: 6, pointBackgroundColor: '#c8102e', borderWidth: 3
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { min: 0, max: 10, grid: { color: 'rgba(148,163,184,0.15)' } },
          x: { grid: { display: false } }
        }
      }
    });
  },

  overallPerformance(canvasId, subjectsPerformance) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    this.destroy(canvasId);
    const labels = subjectsPerformance.map(s => s.code);
    const data = subjectsPerformance.map(s => s.percentage);
    this._instances[canvasId] = new Chart(ctx, {
      type: 'radar',
      data: {
        labels,
        datasets: [{
          label: 'Performance %',
          data,
          borderColor: '#9f1239',
          backgroundColor: 'rgba(159,18,57,0.12)',
          pointBackgroundColor: '#9f1239',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { r: { min: 0, max: 100, ticks: { stepSize: 20 } } }
      }
    });
  },

  labBreakdown(canvasId, components) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    this.destroy(canvasId);
    const labels = components.map(c => c.name);
    const data = components.map(c => c.marks);
    const max = components.map(c => c.maxMarks);
    this._instances[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: ['#c8102e','#9f1239','#f43f5e','#f59e0b','#10b981'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: { position: 'bottom', labels: { usePointStyle: true, padding: 18, font: { size: 11 } } },
          tooltip: { callbacks: { label: (c) => ` ${c.label}: ${c.parsed}/${max[c.dataIndex]}` } }
        }
      }
    });
  }
};
