import React, { useState, useEffect } from "react";
import { Bar } from "react-chartjs-2";
import Sidebar from "../../Components/Sidebar/Sidebar";
import api from "../../api/axios";
import "./SalesReport.css";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function InventoryReport() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  });
  const [movementData, setMovementData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMovement = async () => {
      setLoading(true);
      try {
        const res = await api.get("/api/inventory/movement-report", {
          params: { month: selectedMonth },
        });
        setMovementData(res.data);
      } catch (err) {
        setMovementData([]);
      }
      setLoading(false);
    };
    fetchMovement();
  }, [selectedMonth]);

  const data = {
    labels: movementData.map((item) => item.month.trim()),
    datasets: [
      {
        label: "Products In (Restocked)",
        data: movementData.map((item) => Number(item.additions)),
        backgroundColor: "rgba(75, 192, 192, 0.7)",
        borderColor: "rgb(75, 192, 192)",
        borderWidth: 1,
      },
      {
        label: "Products Out (Sales/Orders)",
        data: movementData.map((item) => Number(item.reductions)),
        backgroundColor: "rgba(255, 99, 132, 0.7)",
        borderColor: "rgb(255, 99, 132)",
        borderWidth: 1,
      },
    ],
  };

  const maxValue = Math.max(
    ...movementData.map((item) => Number(item.additions) || 0),
    ...movementData.map((item) => Number(item.reductions) || 0),
    0
  );
  const yAxisMax = maxValue * 2 || 10;

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: "Inventory Movement Report (In & Out)",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: yAxisMax,
        title: {
          display: true,
          text: "Number of Items",
        },
      },
    },
  };

  const renderContent = () => {
    return (
      <div className="report-container">
        <h2 className="report-title">Inventory Movement Report</h2>
        <div className="month-picker-container">
          <label className="month-picker-label" htmlFor="month-picker">
            Select Month:
          </label>
          <input
            id="month-picker"
            className="month-picker-input"
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
        </div>
        <div className="chart-container">
          {loading ? (
            <div className="loading-message">Loading movement data...</div>
          ) : (
            <Bar
              data={data}
              options={{
                ...options,
                maintainAspectRatio: false,
                responsive: true,
              }}
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="dashboard-content">
        <div className="content-wrapper">{renderContent()}</div>
      </div>
    </div>
  );
}
