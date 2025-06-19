import React, { useState } from "react";
import { Bar } from "react-chartjs-2";
import Sidebar from "../../Components/Sidebar/Sidebar";
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

// Mock data for demonstration (now with both in and out)
const MOCK_DATA = [
  { month: "January 2025", additions: 40, reductions: 30 },
  { month: "February 2025", additions: 35, reductions: 22 },
  { month: "March 2025", additions: 25, reductions: 18 },
  { month: "April 2025", additions: 30, reductions: 25 },
  { month: "May 2025", additions: 20, reductions: 15 },
  { month: "June 2025", additions: 15, reductions: 10 },
];

export default function InventoryReport() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  });

  // Filter data by selected month (YYYY-MM)
  const filteredData = React.useMemo(() => {
    if (!selectedMonth) return MOCK_DATA;
    const [year, month] = selectedMonth.split("-");
    return MOCK_DATA.filter((item) => {
      if (!item.month) return false;
      // Parse month string like "June 2025"
      const [itemMonth, itemYear] = item.month.trim().split(" ");
      const itemMonthNum =
        new Date(`${itemMonth} 1, ${itemYear}`).getMonth() + 1;
      return (
        String(itemYear) === year &&
        String(itemMonthNum).padStart(2, "0") === month
      );
    });
  }, [selectedMonth]);

  const data = {
    labels: filteredData.map((item) => item.month.trim()),
    datasets: [
      {
        label: "Products In (Restocked)",
        data: filteredData.map((item) => Number(item.additions)),
        backgroundColor: "rgba(75, 192, 192, 0.7)",
        borderColor: "rgb(75, 192, 192)",
        borderWidth: 1,
      },
      {
        label: "Products Out (Sales/Orders)",
        data: filteredData.map((item) => Number(item.reductions)),
        backgroundColor: "rgba(255, 99, 132, 0.7)",
        borderColor: "rgb(255, 99, 132)",
        borderWidth: 1,
      },
    ],
  };

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
          <Bar
            data={data}
            options={{
              ...options,
              maintainAspectRatio: false,
              responsive: true,
            }}
          />
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
