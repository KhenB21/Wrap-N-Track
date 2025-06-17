import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import TopBar from '../../Components/TopBar';
import Sidebar from '../../Components/Sidebar/Sidebar';
import './ArchivedOrders.css';

const ArchivedOrders = () => {
    const [archivedOrders, setArchivedOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchArchivedOrders = async () => {
            try {
                const response = await api.get('/api/orders/archived');
                setArchivedOrders(response.data);
                setIsLoading(false);
            } catch (err) {
                setError('Failed to fetch archived orders.');
                setIsLoading(false);
                console.error(err);
            }
        };

        fetchArchivedOrders();
    }, []);

    const getStatusColor = (status) => {
        switch (status.toLowerCase()) {
            case 'completed':
                return '#28a745'; // Green
            case 'cancelled':
                return '#dc3545'; // Red
            default:
                return '#6c757d'; // Gray
        }
    };

    return (
        <div className="dashboard-container">
            <Sidebar />
            <div className="dashboard-main">
                <TopBar />
                <div className="archived-orders-container">
                    <div className="archived-orders-header">
                        <h1 className="archived-orders-title">Archived Orders</h1>
                        <button onClick={() => navigate('/orders')} className="back-button">
                            Back to Orders
                        </button>
                    </div>
                    {isLoading ? (
                        <p>Loading archived orders...</p>
                    ) : error ? (
                        <p className="error-message">{error}</p>
                    ) : (
                        <div className="archived-orders-list">
                            {archivedOrders.length > 0 ? (
                                archivedOrders.map(order => (
                                    <div key={order.order_id} className="archived-order-card">
                                        <div className="order-card-header">
                                            <span className="order-name">{order.name}</span>
                                            <span 
                                                className="order-status" 
                                                style={{ backgroundColor: getStatusColor(order.status) }}
                                            >
                                                {order.status}
                                            </span>
                                        </div>
                                        <div className="order-card-body">
                                            <p><strong>Order ID:</strong> {order.order_id}</p>
                                            <p><strong>Customer:</strong> {order.shipped_to}</p>
                                            <p><strong>Total:</strong> ₱{Number(order.total_cost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                            <p><strong>Date:</strong> {new Date(order.order_date).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p>No archived orders found.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ArchivedOrders;
