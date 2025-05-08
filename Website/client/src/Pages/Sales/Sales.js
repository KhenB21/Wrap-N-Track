import React, { useEffect, useState } from "react";
import "./Sales.css";
import { Button, Checkbox, DatePicker, Dropdown, Form, Image, Input, InputNumber, Modal, Select, Space, Upload } from "antd";
import { BarcodeOutlined, CloseOutlined, DeleteOutlined, DingtalkCircleFilled, DownOutlined, EditOutlined, MinusCircleOutlined, MoreOutlined, PlusOutlined, SearchOutlined, ShoppingCartOutlined } from "@ant-design/icons";
import Sidebar from "../../Components/Sidebar/Sidebar";
import { Option } from "antd/es/mentions";
import '@ant-design/v5-patch-for-react-19';
import { v4 as uuidv4 } from 'uuid';
import dayjs from "dayjs";
import TopBar from "../../Components/TopBar";


const salesOnSearch = (value) => {
    console.log("Search value:", value);
};


const { Search } = Input;

const salesDropDownItems1 = [
    {
      label: ('1st menu item'),
      key: '0',
    },
    {
      label: ('2nd menu item'),
      key: '1',
    },
    {
      label: '3rd menu item',
      key: '3',
    },
  ];

const Sales = () => {

    const [selectedSalesCheckBoxCount, setSelectedSalesCheckBoxCount] = useState(0);
    const [selectedSalesCheckboxes, setSelectedSalesCheckboxes] = useState([]);
    const [selectedSalesRows, setSelectedSalesRows] = useState([]);

    const [selectedSalesItem, setSelectedSalesItem] = useState(null);
    const [salesItemModalOpen, setSalesItemModalOpen] = useState(false);

    const handleSalesRowClick = (item) => {
        setSelectedSalesItem(item);
        setSalesItemModalOpen(true);
    };

    const handleSalesCheckboxChange = (event, rowSalesId) => {
        setSelectedSalesRows(prevSalesSelected => {
            const newSalesSelection = event.target.checked
                ? [...prevSalesSelected, rowSalesId] 
                : prevSalesSelected.filter(id => id !== rowSalesId);
            
            console.log("✅ New Selection:", newSalesSelection);
    
            setSelectedSalesCheckBoxCount(newSalesSelection.length);
            return newSalesSelection; 
        });
    };    

    const handleSalesSelectedCountClose = () => {
        setSelectedSalesCheckBoxCount(0);
        setSelectedSalesRows([]);
        setSelectedSalesCheckboxes([]);
    };
    
    
    const [newSalesOrderModalOpen, setNewSalesOrderModalOpen] = useState(false);

    const [salesItems, setSalesItems] = useState([
        {
            id: 1,
            orderId: "#CO-00001",
            name: "Reinan John",
            shippedTo: "Terence Auyong",
            orderDate: "01/23/25",
            expectedDelivery: "02/09/25",
            status: "Completed",
            shippingAddress: "50 Rose st., Zapote, Las Pinas city, Metro Manila, 1740",
            totalCost: "30420.00",
            remarks: "Fragile handle with care",
        }
    ]);

    const getNextOrderId = () => {
        if (salesItems.length === 0) return "#CO-00001";
    
        const highestOrderId = Math.max(...salesItems.map(item => parseInt(item.orderId.replace("#CO-", ""), 10)));
        return `#CO-${String(highestOrderId + 1).padStart(5, "0")}`;
    };
    

    const handleAddOrder = () => {
        const newItem = {
            id: uuidv4(),
            orderId: getNextOrderId(), 
            name: name || "Unknown",
            shippedTo: shippedTo || "Unknown",
            orderDate: orderDate ? dayjs(orderDate) : dayjs(),
            expectedDelivery: expectedDelivery ? dayjs(expectedDelivery) : dayjs(),
            status: status || "Unknown",
            shippingAddress: shippingAddress || "Unknown",
            totalCost: totalCost || "Unknown",
            remarks: remarks || "Unknown",
        };
    
        setSalesItems([...salesItems, newItem]); 
        resetInputs();
        setNewSalesOrderModalOpen(false);
    };
    
    

    const [orderId, setOrderId] = useState("");
    const [name, setName] = useState("");
    const [shippedTo, setShippedTo] = useState("");
    const [orderDate, setOrderDate] = useState(dayjs(null));
    const [expectedDelivery, setExpectedDelivery] = useState(null);
    const [status, setStatus] = useState("");
    const [shippingAddress, setShippingAddress] = useState("");
    const [totalCost, setTotalCost] = useState("");
    const [remarks, setRemarks] = useState("");

    console.log("🚀 Saved Order Date:", orderDate);
    console.log("🚀 Saved Expected Delivery:", expectedDelivery);


    const resetInputs = () => {
        setOrderId("");
        setName("");
        setShippedTo("");
        setOrderDate("");
        setExpectedDelivery("");
        setStatus("");
        setShippingAddress("");
        setTotalCost("");
        setRemarks("");
    };

    const [editingSalesRowId, setSalesEditingRowId] = useState(null);


    const handleEditOrder = () => {
        if (selectedSalesRows.length === 0) return; 
        
        const selectedSalesItem = salesItems.find(item => item.id === selectedSalesRows[0]);

        if (!selectedSalesItem) {
            console.error("Error: No selected item found.");
            return;
        }

        setOrderId(selectedSalesItem.orderId);
        setName(selectedSalesItem.name);
        setShippedTo(selectedSalesItem.shippedTo);
        setOrderDate(dayjs(selectedSalesItem.orderDate));
        setExpectedDelivery(selectedSalesItem.expectedDelivery && dayjs(selectedSalesItem.expectedDelivery).isValid() ? dayjs(selectedSalesItem.expectedDelivery) : null);
        setStatus(selectedSalesItem.status);
        setShippingAddress(selectedSalesItem.shippingAddress);
        setTotalCost(selectedSalesItem.totalCost);
        setRemarks(selectedSalesItem.remarks);

        setSalesEditingRowId(selectedSalesItem.id);
        setNewSalesOrderModalOpen(true);
    };

    
    const handleSalesSaveChanges = () => {
        const updatedSalesItems = salesItems.map(item =>
            item.id === editingSalesRowId
                ? { 
                    ...item, 
                    orderId, 
                    name, 
                    shippedTo, 
                    orderDate: orderDate ? orderDate.format("YYYY-MM-DD") : "",
                    expectedDelivery: expectedDelivery ? expectedDelivery.format("YYYY-MM-DD") : "", 
                    status, 
                    shippingAddress, 
                    totalCost,
                    remarks,
                }
                : item
        );
    
        console.log("🚀 Updated Items After Save:", updatedSalesItems);
    
        setSalesItems(updatedSalesItems);
        setSelectedSalesRows([]);
        setSalesEditingRowId(null);
        resetInputs();
    
        setNewSalesOrderModalOpen(false);
    };    
    
    useEffect(() => {
        console.log("Sales Updated:", salesItems);
    }, [salesItems]);    
    

    const handleDeleteOrder = () => {
        Modal.confirm({
            title: "Delete Products",
            content: `Are you sure you want to delete ${selectedSalesRows.length} selected products?`,
            okText: "Delete",
            cancelText: "Cancel",
            onOk: () => {
                setSalesItems(prevItems => prevItems.filter(item => !selectedSalesRows.includes(item.id)));
                setSelectedSalesRows([]);
                setSelectedSalesCheckBoxCount(0);
            },
        });
    };    
    

    return (

        <div className="salesContainer">

            <div className="salesSideNav">
                <Sidebar />
            </div>

            <div className="salesSubContainer2">

                <div className="salesTopBar">
                    <TopBar />
                </div>

                <div className="salesContentContainer1">

                <div className="salesResponsiveButtonRow" style={{gap: "5px", marginLeft: "10px"}}>
                    <div style={{display: "flex", flexDirection: "row", gap: "5px"}}>
                        <Button
                            type="primary"
                            className="salesEditButton"
                            disabled={selectedSalesRows.length === 0}
                            onClick={handleEditOrder}
                            style={{width: "50px", fontSize: "10px", borderRadius: "5px", marginLeft: 0}}
                        >
                            <EditOutlined /> Edit
                        </Button>

                        <Button
                            type="primary"
                            className="salesDeleteButton"
                            disabled={selectedSalesRows.length === 0}
                            onClick={handleDeleteOrder}
                            style={{width: "60px", fontSize: "10px", borderRadius: "5px"}}
                        >
                            <DeleteOutlined /> Delete
                        </Button>
                        <Button
                            type="primary"
                            className="salesCreateOrderButton"
                            style={{marginLeft: 0, width: "90px", fontSize: "10px", borderRadius: "5px"}}
                        >
                            <ShoppingCartOutlined />Create Order
                        </Button>

                        <Button
                            type="primary"
                            className="salesAddOrderButton"
                            onClick={() => {
                                setSalesEditingRowId(null);
                                setSelectedSalesRows([]);
                                resetInputs();
                                setNewSalesOrderModalOpen(true);
                            }}
                            style={{marginLeft: 0, width: "90px", fontSize: "10px", borderRadius: "5px"}}
                        >
                            Add Product<PlusOutlined />
                        </Button>
                    </div>
                        {selectedSalesRows.length > 0 && (
                            <div className="salesSelectedDiv" style={{display: "flex", marginLeft: "0px"}}>
                                <div style={{ display: "flex", flexDirection: "row", gap: "5px", width: "100%" }}>
                                    <p>{selectedSalesRows.length}</p>
                                    <p>Selected</p>
                                </div>
                                <Button
                                    className="salesSelectedDivCloseButton"
                                    style={{ border: "none" }}
                                    onClick={handleSalesSelectedCountClose}
                                >
                                    <CloseOutlined />
                                </Button>
                            </div>
                        )}
                </div>

                    <div className="salesButtonRow">
                        <Button
                            type="primary"
                            className="salesEditButton"
                            disabled={selectedSalesRows.length === 0}
                            onClick={handleEditOrder}
                        >
                            <EditOutlined /> Edit
                        </Button>

                        <Button
                            type="primary"
                            className="salesDeleteButton"
                            disabled={selectedSalesRows.length === 0}
                            onClick={handleDeleteOrder}
                        >
                            <DeleteOutlined /> Delete
                        </Button>
                        <Button
                            type="primary"
                            className="salesCreateOrderButton"
                        >
                            <ShoppingCartOutlined />Create Order
                        </Button>

                        {selectedSalesRows.length > 0 && (
                            <div className="salesSelectedDiv">
                                <div style={{ display: "flex", flexDirection: "row", gap: "5px", width: "100%" }}>
                                    <p>{selectedSalesRows.length}</p>
                                    <p>Selected</p>
                                </div>
                                <Button
                                    className="salesSelectedDivCloseButton"
                                    style={{ border: "none" }}
                                    onClick={handleSalesSelectedCountClose}
                                >
                                    <CloseOutlined />
                                </Button>
                            </div>
                        )}

                        <Button
                            type="primary"
                            className="salesAddOrderButton"
                            onClick={() => {
                                setSalesEditingRowId(null);
                                setSelectedSalesRows([]);
                                resetInputs();
                                setNewSalesOrderModalOpen(true);
                            }}
                        >
                            Add Order<PlusOutlined />
                        </Button>

                        <Modal
                            title={editingSalesRowId ? "Edit Order" : "New Order"}
                            centered
                            open={newSalesOrderModalOpen}
                            onCancel={() => { setNewSalesOrderModalOpen(false); setSalesEditingRowId(null); }}
                            footer={[
                                <Button key="cancel" onClick={() => { setNewSalesOrderModalOpen(false); setSalesEditingRowId(null); }}>
                                    Cancel
                                </Button>,
                                <Button
                                    key={editingSalesRowId ? "saveOrder" : "addOrder"}
                                    type="primary"
                                    onClick={editingSalesRowId ? handleSalesSaveChanges : handleAddOrder}
                                >
                                    {editingSalesRowId ? "Save Changes" : "Add Order"}
                                </Button>,
                            ]}
                        >
                            <div style={{
                                display: "flex",
                                flexDirection: "column",
                                height: "500px",
                                width: "490px",
                                gap: "30px",
                                overflowY: "auto",
                                }}
                            >

                                <p style={{fontSize: "24px"}}>Order Details</p>

                                <div style={{display: "flex", flexDirection: "column"}}>
                                    <p style={{fontSize: "16px"}}>Order Number</p>
                                    <Input
                                        placeholder="Enter Order Number"
                                        addonAfter={<MoreOutlined style={{ cursor: "pointer" }} />}
                                        style={{ width: 470 }}
                                        required
                                        value={orderId}
                                        onChange={(e) => setOrderId(e.target.value)}
                                    />
                                </div>

                                <div style={{display: "flex", flexDirection: "column"}}>
                                    <p style={{fontSize: "16px"}}>Customer Name</p>
                                    <Input
                                        placeholder="Enter Customer Name"
                                        addonAfter={<MoreOutlined style={{ cursor: "pointer" }} />}
                                        style={{ width: 470 }}
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>

                                <div style={{display: "flex", flexDirection: "column"}}>
                                    <p style={{fontSize: "16px"}}>Shipped To</p>
                                    <Input
                                        placeholder="Enter Name"
                                        style={{ width: 470 }}
                                        required
                                        value={shippedTo}
                                        onChange={(e) => setShippedTo(e.target.value)}
                                    />
                                </div>

                                <div style={{display: "flex", flexDirection: "column"}}>
                                    <p style={{fontSize: "16px"}}>Items</p>
                                    
                                    <Form
                                        name="dynamic_form_nest_item"
                                        style={{ maxWidth: 600 }}
                                        autoComplete="off"
                                    >
                                        <Form.List name="users">
                                        {(fields, { add, remove }) => (
                                            <>
                                            {fields.map(_a => {
                                                var { key, name } = _a;
                                                return (
                                                <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                                                    <Form.Item
                                                    name={[name, 'last']}
                                                    rules={[{ required: true, message: 'Missing item' }]}
                                                    >
                                                    <Input placeholder="Enter Item" />
                                                    </Form.Item>
                                                    <MinusCircleOutlined onClick={() => remove(name)} />
                                                </Space>
                                                );
                                            })}
                                            <Form.Item>
                                                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}
                                                style={{width: "95%"}}
                                                >
                                                Add item
                                                </Button>
                                            </Form.Item>
                                            </>
                                        )}
                                        </Form.List>
                                    </Form>
                                </div>

                                <div style={{display: "flex", flexDirection: "column"}}>
                                    <p style={{fontSize: "16px"}}>Order Date</p>
                                    <DatePicker
                                        placeholder="Enter Order Date"
                                        style={{ width: 470 }}
                                        required
                                        value={orderDate}
                                        onChange={(date) => setOrderDate(date)}
                                    />
                                </div>

                                <div style={{display: "flex", flexDirection: "column"}}>
                                    <p style={{fontSize: "16px"}}>Expected Delivery</p>
                                    <DatePicker
                                        placeholder="Enter Delivery Date"
                                        style={{ width: 470 }}
                                        required
                                        value={expectedDelivery}
                                        onChange={(date) => setExpectedDelivery(date)}
                                    />
                                </div>

                                <div style={{display: "flex", flexDirection: "column"}}>
                                    <p style={{fontSize: "16px"}}>Status</p>
                                    <Select
                                        placeholder="Select Status"
                                        allowClear
                                        value={status || ""}
                                        onChange={(value) => setStatus(value || "")}
                                    >
                                        <Select.Option value="salesCompleted">salesCompleted</Select.Option>
                                        <Select.Option value="salesPacked">salesPacked</Select.Option>
                                        <Select.Option value="salesWaiting">salesWaiting</Select.Option>
                                    </Select>
                                </div>

                                <div style={{display: "flex", flexDirection: "column"}}>
                                    <p style={{fontSize: "16px"}}>Total Cost</p>
                                    <InputNumber
                                        min={1}
                                        placeholder="Enter Total Cost"
                                        style={{ width: 470 }}
                                        value={totalCost}
                                        onChange={(value) => setTotalCost(value)}
                                    />
                                </div>

                                <div style={{display: "flex", flexDirection: "column"}}>
                                    <p style={{fontSize: "16px"}}>Remarks</p>
                                    <Input
                                        placeholder="Enter Remarks"
                                        style={{ width: 470 }}
                                        required
                                        value={remarks}
                                        onChange={(e) => setRemarks(e.target.value)}
                                    />
                                </div>

                                <p style={{fontSize: "24px"}}>Address Details</p>

                                <div style={{display: "flex", flexDirection: "row", gap: "5px"}}>
                                    <Checkbox />
                                    <p style={{fontSize: "16px"}}>Use Customer's Saved Address</p>
                                </div>

                                <div style={{display: "flex", flexDirection: "column"}}>
                                    <p style={{fontSize: "16px"}}>Shipping Address</p>
                                    <Input
                                        placeholder="Enter Shipping Address"
                                        style={{ width: 470 }}
                                        required
                                        value={shippingAddress}
                                        onChange={(e) => setShippingAddress(e.target.value)}
                                    />
                                </div>

                            </div>
                            

                        </Modal>
                    </div>

                    <div className="salesResponsiveTotalProductsRow">
                        <div
                            style={{display: "flex",
                                flexDirection: "row",
                                marginRight: "auto",
                            }}
                        >
                            <p
                                style={{
                                    fontSize: "14px",
                                    fontWeight: "bold",
                            }}
                            >
                                Total Sales:
                            </p>
                            <p
                                style={{
                                    fontSize: "14px",
                                    marginLeft: "10px",
                            }}
                            >
                                {salesItems.length}
                            </p>
                        </div>

                        <div style={{display: "flex", flexDirection: "row", gap: "10px"}}>
                            <Input
                                placeholder="Search"
                                onSearch={salesOnSearch}
                                addonAfter={<SearchOutlined style={{ cursor: "pointer" }} />}
                                className="salesSearchBar"
                            />
                        </div>
                    </div>

                    <div className="salesTotalProductsRow">
                        <div
                            style={{display: "flex",
                                flexDirection: "row",
                                marginRight: "auto",
                            }}
                        >
                            <p
                                style={{
                                    fontSize: "14px",
                                    fontWeight: "bold",
                            }}
                            >
                                Total Sales:
                            </p>
                            <p
                                style={{
                                    fontSize: "14px",
                                    marginLeft: "10px",
                            }}
                            >
                                {salesItems.length}
                            </p>
                        </div>

                        <div
                            style={{display: "flex",
                                flexDirection: "row",
                                marginLeft: "auto",
                                gap: "15px"
                            }}
                        >
                            <Dropdown menu={{ items: salesDropDownItems1 }} trigger={['click']}>
                                <Button
                                    onClick={e => e.preventDefault()}
                                    className="salesDropDown1"
                                    id="salesDropDowns"
                                >
                                    All
                                    <DownOutlined style={{marginLeft: "auto"}}/>
                                </Button>
                            </Dropdown>
                            <Dropdown menu={{ items: salesDropDownItems1 }} trigger={['click']}>
                                <Button
                                    onClick={e => e.preventDefault()}
                                    className="salesDropDown2"
                                    id="salesDropDowns"
                                >
                                    Category
                                    <DownOutlined style={{marginLeft: "auto"}}/>
                                </Button>
                            </Dropdown>
                            <Dropdown menu={{ items: salesDropDownItems1 }} trigger={['click']}>
                                <Button
                                    onClick={e => e.preventDefault()}
                                    className="salesDropDown3"
                                    id="salesDropDowns"
                                >
                                    Filter
                                    <DownOutlined style={{marginLeft: "auto"}}/>
                                </Button>
                            </Dropdown>
                            <Input
                                placeholder="Search"
                                onSearch={salesOnSearch}
                                addonAfter={<SearchOutlined style={{ cursor: "pointer" }} />}
                                className="salesSearchBar"
                            />
                        </div>
                    </div>

                    <div className="salesProductsTable">
                        
                        <div className="salesProductsTableHeader">
                            <div className="salesCheckBoxFiller"></div>
                            {["ORDER ID", "NAME", "SHIPPED TO", "ORDER DATE", "EXPECTED DELIVERY", "STATUS", "SHIPPING ADDRESS", "TOTAL COST", "REMARKS"].map(header => (
                                <div key={header} className="salesProductsTableHeaderDivs">{header}</div>
                            ))}
                        </div>

                        {salesItems.map((item) => (
                            <div 
                                key={item.id} 
                                className="salesProductsTableListItems"
                            >
                                <Checkbox
                                    className="salesCheckBox"
                                    checked={selectedSalesRows.includes(item.id)}
                                    onChange={(e) => handleSalesCheckboxChange(e, item.id)}
                                />
                                <div className="salesProductsTableListItemsDivs">{item.orderId}</div>
                                <div className="salesProductsTableListItemsDivs">{item.name}</div>
                                <div className="salesProductsTableListItemsDivs">{item.shippedTo}</div>
                                <div className="salesProductsTableListItemsDivs">
                                    {item.orderDate ? dayjs(item.orderDate).format("YYYY-MM-DD") : "N/A"}
                                </div>
                                <div className="salesProductsTableListItemsDivs">
                                    {item.expectedDelivery ? dayjs(item.expectedDelivery).format("YYYY-MM-DD") : "N/A"}
                                </div>
                                <div className="salesProductsTableListItemsDivs">{item.status}</div>
                                <div className="salesProductsTableListItemsDivs">{item.shippingAddress}</div>
                                <div className="salesProductsTableListItemsDivs">{item.totalCost}</div>
                                <div className="salesProductsTableListItemsDivs">{item.remarks}</div>
                            </div>
                        ))}

                    </div>



                    <div className="salesResponsiveProductsTable">
                        
                        <div className="salesProductsTableListColumn">
                            {salesItems.map((item) => (
                                <div style={{display: "flex", flexDirection: "row", gap: "5px", alignItems: "center"}}>
                                    <div className="salesCheckBoxContainer">
                                        <Checkbox
                                            className="salesCheckBox"
                                            checked={selectedSalesRows.includes(item.id)}
                                            onChange={(e) => handleSalesCheckboxChange(e, item.id)}
                                        />
                                    </div>
                                    <Button 
                                        key={item.id} 
                                        className="salesProductsTableListItems"
                                        style={{height: "fit-content", padding: "10px", width: "fit-content"}}
                                        onClick={() => handleSalesRowClick(item)}
                                    >
                                        <div style={{flexDirection: "column", width: "fit-content"}}>
                                            <div className="salesProductsTableListItemsDivs">{item.shippedTo}</div>

                                            <div className="salesProductsTableListItemsDivs">{item.orderId}</div>

                                            <div className="salesProductsTableListItemsDivs">{item.expectedDelivery ? dayjs(item.expectedDelivery).format("YYYY-MM-DD") : "N/A"}</div>
                                        </div>

                                        <div style={{flexDirection: "column", width: "fit-content"}}>
                                            <div className="salesProductsTableListItemsDivs">{item.status}</div>
                                            <div className="salesProductsTableListItemsDivs">{item.totalCost}</div>
                                        </div>
                                    </Button>
                                </div>
                            ))}
                        </div>

                    </div>



                    <Modal
                        title="Order Details"
                        visible={salesItemModalOpen}
                        onCancel={() => setSalesItemModalOpen(false)}
                        footer={null}
                    >
                        <div style={{display: "flex", flexDirection: "column", gap: "10px", overflowY: "auto",}}>
                            <div style={{display: "flex", flexDirection: "row"}}>
                                <p style={{color: "#888888"}}>Order ID</p>
                                <p style={{marginLeft: "auto"}}>{selectedSalesItem?.orderId}</p>
                            </div>
                            <div style={{display: "flex", flexDirection: "row"}}>
                                <p style={{color: "#888888"}}>Name</p>
                                <p style={{marginLeft: "auto"}}>{selectedSalesItem?.name}</p>
                            </div>
                            <div style={{display: "flex", flexDirection: "row"}}>
                                <p style={{color: "#888888"}}>Shipped To</p>
                                <p style={{marginLeft: "auto"}}>{selectedSalesItem?.shippedTo}</p>
                            </div>
                            <div style={{display: "flex", flexDirection: "row"}}>
                                <p style={{color: "#888888"}}>Order Date</p>
                                <p style={{marginLeft: "auto"}}>{selectedSalesItem?.orderDate ? dayjs(selectedSalesItem.orderDate).format("YYYY-MM-DD") : "N/A"}</p>
                            </div>
                            <div style={{display: "flex", flexDirection: "row"}}>
                                <p style={{color: "#888888"}}>Expected Delivery</p>
                                <p style={{marginLeft: "auto"}}>{selectedSalesItem?.expectedDelivery && dayjs(selectedSalesItem.expectedDelivery).isValid() ? dayjs(selectedSalesItem.expectedDelivery).format("YYYY-MM-DD") : "N/A"}</p>
                            </div>
                            <div style={{display: "flex", flexDirection: "row"}}>
                                <p style={{color: "#888888"}}>Status</p>
                                <p style={{marginLeft: "auto"}}>{selectedSalesItem?.status}</p>
                            </div>
                            <div style={{display: "flex", flexDirection: "row"}}>
                                <p style={{color: "#888888"}}>Shipping Address</p>
                                <p style={{marginLeft: "auto"}}>{selectedSalesItem?.shippingAddress}</p>
                            </div>
                            <div style={{display: "flex", flexDirection: "row"}}>
                                <p style={{color: "#888888"}}>Total Cost</p>
                                <p style={{marginLeft: "auto"}}>{selectedSalesItem?.totalCost}</p>
                            </div>
                            <div style={{display: "flex", flexDirection: "row"}}>
                                <p style={{color: "#888888"}}>Remarks</p>
                                <p style={{marginLeft: "auto"}}>{selectedSalesItem?.remarks}</p>
                            </div>
                        </div>
                    </Modal>



                </div>

            </div>

        </div>

    );

}

export default Sales;