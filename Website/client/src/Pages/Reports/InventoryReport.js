import React from "react";
import { Bar } from "react-chartjs-2";
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

const data = {
  labels: ["January", "February", "March", "April", "May", "June"],
  datasets: [
    {
      label: "Inventory In",
      data: [100, 200, 150, 180, 120, 160],
      backgroundColor: "rgba(54, 162, 235, 0.5)",
    },
    {
      label: "Inventory Out",
      data: [80, 150, 120, 140, 100, 130],
      backgroundColor: "rgba(255, 206, 86, 0.5)",
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
      text: "Inventory Movement",
    },
  },
};

export default function InventoryReport() {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 24 }}>
      <h2>Inventory Report</h2>
      <Bar data={data} options={options} />
    </div>
  );
}
