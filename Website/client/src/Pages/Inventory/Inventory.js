import React, { useEffect, useState } from "react";
import "./Inventory.css";
import { Button, Checkbox, Dropdown, Image, Input, InputNumber, Modal, Select, Space, Upload } from "antd";
import { BarcodeOutlined, CloseOutlined, DeleteOutlined, DingtalkCircleFilled, DownOutlined, EditOutlined, PlusOutlined, SearchOutlined, ShoppingCartOutlined } from "@ant-design/icons";
import Sidebar from "../../Components/Sidebar/Sidebar";
import { Option } from "antd/es/mentions";
import '@ant-design/v5-patch-for-react-19';
import { v4 as uuidv4 } from 'uuid';


const inventoryGetBase64 = file =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });

const inventoryOnSearch = (value) => {
    console.log("Search value:", value);
};


const { Search } = Input;

const inventoryDropDownItems1 = [
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

const Inventory = () => {

    const [selectedInventoryCheckBoxCount, setSelectedInventoryCheckBoxCount] = useState(0);
    const [selectedInventoryCheckboxes, setSelectedInventoryCheckboxes] = useState([]);
    const [selectedInventoryRows, setSelectedInventoryRows] = useState([]);

    const handleInventoryCheckboxChange = (event, rowInventoryId) => {
        setSelectedInventoryRows(prevInventorySelected => {
            const newInventorySelection = event.target.checked
                ? [...prevInventorySelected, rowInventoryId] 
                : prevInventorySelected.filter(id => id !== rowInventoryId);
            
            console.log("✅ New Selection:", newInventorySelection); // 🔥 Debugging selection state
    
            setSelectedInventoryCheckBoxCount(newInventorySelection.length); // ✅ Sync count with selected rows
            return newInventorySelection; 
        });
    };    

    const handleInventorySelectedCountClose = () => {
        setSelectedInventoryCheckBoxCount(0);
        setSelectedInventoryRows([]); // ✅ Clear selection properly
        setSelectedInventoryCheckboxes([]);
    };
    
    
    const [newInventoryProductModalOpen, setNewInventoryProductModalOpen] = useState(false);

    const [inventoryItems, setInventoryItems] = useState([
        {
            id: 1,
            sku: "#IN-00001",
            supplier: "Celestea",
            category: "Beverages",
            item: "Artisan Teas",
            variant: "Oolong Tea",
            amountUnit: "1pc",
            price: "195.00",
            stockQty: "156",
            totalPrice: "30420.00",
            imageSrc: "../../Assets/Images/InventoryImages/oolong.svg"
        }
    ]);

    const getNextSKU = () => {
        if (inventoryItems.length === 0) return "#IN-00001"; // First product in inventory
    
        // Extract numeric parts of SKUs, find the highest number, then increment
        const highestSkuNum = Math.max(...inventoryItems.map(item => parseInt(item.sku.replace("#IN-", ""), 10)));
        return `#IN-${String(highestSkuNum + 1).padStart(5, "0")}`; // Keep format consistent
    };
    

    const handleAddProduct = () => {
        const newItem = {
            id: uuidv4(), // ✅ Generates a truly unique ID
            sku: getNextSKU(), 
            supplier: supplier || "Unknown Supplier",
            category: category || "Unknown Category",
            item: item || "Unnamed Item",
            variant: variant || "Unknown Variant",
            amountUnit: amountUnit || "1pc",
            price: price || "0.00",
            stockQty: stockQty || "0",
            totalPrice: (parseFloat(price) * parseInt(stockQty)).toFixed(2) || "0.00",
            imageSrc: "../../Assets/Images/InventoryImages/sample.svg"
        };
    
        setInventoryItems([...inventoryItems, newItem]); 
        resetInputs();
        setNewInventoryProductModalOpen(false);
    };
    
    

    const [sku, setSku] = useState("");
    const [supplier, setSupplier] = useState("");
    const [category, setCategory] = useState("");
    const [item, setItem] = useState("");
    const [variant, setVariant] = useState("");
    const [amountUnit, setAmountUnit] = useState("");
    const [price, setPrice] = useState("");
    const [stockQty, setStockQty] = useState("");

    const resetInputs = () => {
        setSku("");
        setSupplier("");
        setCategory("");
        setItem("");
        setVariant("");
        setAmountUnit("");
        setPrice("");
        setStockQty("");
    };

    const [editingInventoryRowId, setInventoryEditingRowId] = useState(null);

    const handleEditProduct = () => {
        if (selectedInventoryRows.length === 0) return; 
        
        const selectedInventoryItem = inventoryItems.find(item => item.id === selectedInventoryRows[0]); // ✅ Only 1 row
    
        if (!selectedInventoryItem) {
            console.error("Error: No selected item found.");
            return;
        }
    
        // ✅ Set form fields for editing
        setSku(selectedInventoryItem.sku);
        setSupplier(selectedInventoryItem.supplier);
        setCategory(selectedInventoryItem.category);
        setItem(selectedInventoryItem.item);
        setVariant(selectedInventoryItem.variant);
        setAmountUnit(selectedInventoryItem.amountUnit);
        setPrice(selectedInventoryItem.price);
        setStockQty(selectedInventoryItem.stockQty);
    
        setInventoryEditingRowId(selectedInventoryItem.id); // ✅ Track which row is being edited
        setNewInventoryProductModalOpen(true);
    };    
    
    
    const handleSaveChanges = () => {
        const updatedInventoryItems = inventoryItems.map(item =>
            item.id === editingInventoryRowId
                ? { 
                    ...item, 
                    sku, 
                    supplier, 
                    category, 
                    item: typeof item.item === "object" ? item.item.itemName || "" : item.item, // ✅ Converts object to string
                    variant, 
                    amountUnit, 
                    price, 
                    stockQty,
                    totalPrice: (parseFloat(price) * parseInt(stockQty)).toFixed(2) || "0.00",
                  }
                : item
        );
    
        console.log("🚀 Updated Items After Save:", updatedInventoryItems); // 🔥 Debugging: Check updated inventory
    
        setInventoryItems(updatedInventoryItems);
        setSelectedInventoryRows([]); // ✅ Clear selection
        setInventoryEditingRowId(null);
        resetInputs(); // ✅ Ensure the modal fields reset
    
        setNewInventoryProductModalOpen(false);
    };
    
    
    useEffect(() => {
        console.log("Inventory Updated:", inventoryItems); // 🔥 Should log every time inventory changes
    }, [inventoryItems]);    
    

    const handleDeleteProducts = () => {
        Modal.confirm({
            title: "Delete Products",
            content: `Are you sure you want to delete ${selectedInventoryRows.length} selected products?`,
            okText: "Delete",
            cancelText: "Cancel",
            onOk: () => {
                setInventoryItems(prevItems => prevItems.filter(item => !selectedInventoryRows.includes(item.id)));
                setSelectedInventoryRows([]);
                setSelectedInventoryCheckBoxCount(0);
            },
        });
    };    
    



    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewImage, setPreviewImage] = useState('');
    const [fileList, setFileList] = useState([
        {
        uid: '-1',
        name: 'image.png',
        status: 'done',
        url: 'https://zos.alipayobjects.com/rmsportal/jkjgkEfvpUPVyRjUImniVslZfWPnJuuZ.png',
        },
        {
        uid: '-2',
        name: 'image.png',
        status: 'done',
        url: 'https://zos.alipayobjects.com/rmsportal/jkjgkEfvpUPVyRjUImniVslZfWPnJuuZ.png',
        },
        {
        uid: '-3',
        name: 'image.png',
        status: 'done',
        url: 'https://zos.alipayobjects.com/rmsportal/jkjgkEfvpUPVyRjUImniVslZfWPnJuuZ.png',
        },
        {
        uid: '-4',
        name: 'image.png',
        status: 'done',
        url: 'https://zos.alipayobjects.com/rmsportal/jkjgkEfvpUPVyRjUImniVslZfWPnJuuZ.png',
        },
    ]);

    const handlePreview = file =>
        function* () {
        if (!file.url && !file.preview) {
            file.preview = yield inventoryGetBase64(file.originFileObj);
        }
        setPreviewImage(file.url || file.preview);
        setPreviewOpen(true);
        };

    const handleChange = ({ fileList: newFileList }) => setFileList(newFileList);

    const uploadButton = (
        <button style={{ border: 0, background: 'none' }} type="button">
        <PlusOutlined />
        <div style={{ marginTop: 8 }}>Upload</div>
        </button>
    );

    return (

        <div className="inventoryContainer">

            <div className="inventorySideNav">
                <Sidebar />
            </div>

            <div className="inventorySubContainer2">

                <div className="inventoryTopBar">
                    topBar
                </div>

                <div className="inventoryContentContainer1">

                    <div className="inventoryButtonRow">
                    <Button
                        type="primary"
                        className="inventoryEditButton"
                        disabled={selectedInventoryRows.length === 0}
                        onClick={handleEditProduct}
                    >
                        <EditOutlined /> Edit
                    </Button>

                    <Button
                        type="primary"
                        className="inventoryDeleteButton"
                        disabled={selectedInventoryRows.length === 0}
                        onClick={handleDeleteProducts}
                    >
                        <DeleteOutlined /> Delete
                    </Button>
                        <Button
                            type="primary"
                            className="inventoryCreateOrderButton"
                        >
                            <ShoppingCartOutlined />Create Order
                        </Button>

                        {selectedInventoryRows.length > 0 && (
                            <div className="inventorySelectedDiv">
                                <div style={{ display: "flex", flexDirection: "row", gap: "5px", width: "100%" }}>
                                    <p>{selectedInventoryRows.length}</p>
                                    <p>Selected</p>
                                </div>
                                <Button
                                    className="inventorySelectedDivCloseButton"
                                    style={{ border: "none" }}
                                    onClick={handleInventorySelectedCountClose}
                                >
                                    <CloseOutlined />
                                </Button>
                            </div>
                        )}

                        <Button
                            type="primary"
                            className="inventoryAddProductButton"
                            onClick={() => {
                                setInventoryEditingRowId(null); // ✅ Ensure no row is being edited
                                setSelectedInventoryRows([]);   // ✅ Reset selection
                                resetInputs();         // ✅ Reset modal fields
                                setNewInventoryProductModalOpen(true);
                            }}
                        >
                            Add Product<PlusOutlined />
                        </Button>

                        <Modal
                            title={editingInventoryRowId ? "Edit Item" : "New Item"}
                            centered
                            open={newInventoryProductModalOpen}
                            onCancel={() => { setNewInventoryProductModalOpen(false); setInventoryEditingRowId(null); }}
                            footer={[
                                <Button key="cancel" onClick={() => { setNewInventoryProductModalOpen(false); setInventoryEditingRowId(null); }}>
                                    Cancel
                                </Button>,
                                <Button
                                    key={editingInventoryRowId ? "saveProduct" : "addProduct"}
                                    type="primary"
                                    onClick={editingInventoryRowId ? handleSaveChanges : handleAddProduct}
                                >
                                    {editingInventoryRowId ? "Save Changes" : "Add Product"}
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

                                <p style={{fontSize: "24px"}}>Product Details</p>
                                
                                <div>
                                    <Upload
                                        action="https://660d2bd96ddfa2943b33731c.mockapi.io/api/upload"
                                        listType="picture-card"
                                        fileList={fileList}
                                        onPreview={handlePreview}
                                        onChange={handleChange}
                                    >
                                        {fileList.length >= 8 ? null : uploadButton}
                                    </Upload>
                                    {previewImage && (
                                        <Image
                                        wrapperStyle={{ display: 'none' }}
                                        preview={{
                                            visible: previewOpen,
                                            onVisibleChange: visible => setPreviewOpen(visible),
                                            afterOpenChange: visible => !visible && setPreviewImage(''),
                                        }}
                                        src={previewImage}
                                        />
                                    )}
                                </div>

                                <div style={{display: "flex", flexDirection: "column"}}>
                                    <p style={{fontSize: "16px"}}>SKU (Stock Keeping Unit)</p>
                                    <Input
                                        placeholder="Enter Stock Keeping Unit"
                                        addonAfter={<BarcodeOutlined style={{ cursor: "pointer" }} />}
                                        style={{ width: 470 }}
                                        required
                                        value={sku}
                                        onChange={(e) => setSku(e.target.value)}
                                    />
                                </div>

                                <div style={{display: "flex", flexDirection: "column"}}>
                                    <p style={{fontSize: "16px"}}>Supplier</p>
                                    <Select
                                        placeholder="Select Supplier"
                                        allowClear
                                        value={supplier || ""}
                                        onChange={(value) => setSupplier(value || "")}
                                    >
                                        <Select.Option value="inventorySupplier1">inventorySupplier1</Select.Option>
                                        <Select.Option value="inventorySupplier2">inventorySupplier2</Select.Option>
                                        <Select.Option value="inventorySupplier3">inventorySupplier3</Select.Option>
                                    </Select>
                                </div>

                                <div style={{display: "flex", flexDirection: "column"}}>
                                    <p style={{fontSize: "16px"}}>Category</p>
                                    <Select
                                        placeholder="Select Category"
                                        allowClear
                                        value={category || ""}
                                        onChange={(value) => setCategory(value || "")}
                                    >
                                        <Select.Option value="inventoryCategory1">inventoryCategory1</Select.Option>
                                        <Select.Option value="inventoryCategory2">inventoryCategory2</Select.Option>
                                        <Select.Option value="inventoryCategory3">inventoryCategory3</Select.Option>
                                    </Select>
                                </div>

                                <div style={{display: "flex", flexDirection: "column"}}>
                                    <p style={{fontSize: "16px"}}>Item Name</p>
                                    <Input
                                        placeholder="Enter Item Name"
                                        style={{ width: 470 }}
                                        required
                                        value={item}
                                        onChange={(e) => setItem(e.target.value)}
                                    />
                                </div>

                                <div style={{display: "flex", flexDirection: "column"}}>
                                    <p style={{fontSize: "16px"}}>Variant</p>
                                    <Input
                                        placeholder="Enter Variant"
                                        style={{ width: 470 }}
                                        required
                                        value={variant}
                                        onChange={(e) => setVariant(e.target.value)}
                                    />
                                </div>

                                <div style={{display: "flex", flexDirection: "column"}}>
                                    <p style={{fontSize: "16px"}}>Amount/Unit</p>
                                    <InputNumber
                                        min={1}
                                        placeholder="Enter Amount"
                                        style={{ width: 470 }}
                                        value={amountUnit}
                                        onChange={(value) => setAmountUnit(value)}
                                    />
                                </div>

                                <div style={{display: "flex", flexDirection: "column"}}>
                                    <p style={{fontSize: "16px"}}>Price</p>
                                    <InputNumber
                                        min={1}
                                        placeholder="Enter Price"
                                        style={{ width: 470 }}
                                        required
                                        value={price}
                                        onChange={(value) => setPrice(value)}
                                    />
                                </div>

                                <div style={{display: "flex", flexDirection: "column"}}>
                                    <p style={{fontSize: "16px"}}>Stock Qty</p>
                                    <InputNumber
                                        min={1}
                                        placeholder="Enter Stock Qty"
                                        style={{ width: 470 }}
                                        required
                                        value={stockQty}
                                        onChange={(value) => setStockQty(value)}
                                    />
                                </div>

                            </div>
                            

                        </Modal>
                    </div>

                    <div className="inventoryTotalProductsRow">
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
                                Total Products:
                            </p>
                            <p
                                style={{
                                    fontSize: "14px",
                                    marginLeft: "10px",
                            }}
                            >
                                {inventoryItems.length}
                            </p>
                        </div>

                        <div
                            style={{display: "flex",
                                flexDirection: "row",
                                marginLeft: "auto",
                                gap: "15px"
                            }}
                        >
                            <Dropdown menu={{ items: inventoryDropDownItems1 }} trigger={['click']}>
                                <Button
                                    onClick={e => e.preventDefault()}
                                    className="inventoryDropDown1"
                                    id="inventoryDropDowns"
                                >
                                    Active
                                    <DownOutlined style={{marginLeft: "auto"}}/>
                                </Button>
                            </Dropdown>
                            <Dropdown menu={{ items: inventoryDropDownItems1 }} trigger={['click']}>
                                <Button
                                    onClick={e => e.preventDefault()}
                                    className="inventoryDropDown2"
                                    id="inventoryDropDowns"
                                >
                                    Category
                                    <DownOutlined style={{marginLeft: "auto"}}/>
                                </Button>
                            </Dropdown>
                            <Dropdown menu={{ items: inventoryDropDownItems1 }} trigger={['click']}>
                                <Button
                                    onClick={e => e.preventDefault()}
                                    className="inventoryDropDown3"
                                    id="inventoryDropDowns"
                                >
                                    Filter
                                    <DownOutlined style={{marginLeft: "auto"}}/>
                                </Button>
                            </Dropdown>
                            <Input
                                placeholder="Search"
                                onSearch={inventoryOnSearch}
                                addonAfter={<SearchOutlined style={{ cursor: "pointer" }} />}
                                className="inventorySearchBar"
                            />
                        </div>
                    </div>

                    <div className="inventoryProductsTable">
                        
                        <div className="inventoryProductsTableHeader">
                            <div className="inventoryCheckBoxFiller"></div>
                            {["IMAGE", "SKU", "SUPPLIER", "CATEGORY", "ITEM", "VARIANT", "AMOUNT/UNIT", "PRICE", "STOCK QTY", "TOTAL PRICE"].map(header => (
                                <div key={header} className="inventoryProductsTableHeaderDivs">{header}</div>
                            ))}
                        </div>

                        {inventoryItems.map((item) => (
                            <div 
                                key={item.id} 
                                className="inventoryProductsTableListItems"
                            >
                                <Checkbox
                                    className="inventoryCheckBox"
                                    checked={selectedInventoryRows.includes(item.id)}
                                    onChange={(e) => handleInventoryCheckboxChange(e, item.id)}
                                />
                                <div className="inventoryProductsTableListItemsDivs" style={{ width: "100%" }}>
                                    <img 
                                        src={item.imageSrc} 
                                        alt={item.variant} 
                                        style={{ width: "60px", border: "#888888 1px solid" }} 
                                    />
                                </div>
                                <div className="inventoryProductsTableListItemsDivs">{item.sku}</div>
                                <div className="inventoryProductsTableListItemsDivs">{item.supplier}</div>
                                <div className="inventoryProductsTableListItemsDivs">{item.category}</div>
                                <div className="inventoryProductsTableListItemsDivs">
                                    {typeof item.item === "object" ? item.item.itemName || "" : item.item} {/* ✅ Converts object to string */}
                                </div>
                                <div className="inventoryProductsTableListItemsDivs">{item.variant}</div>
                                <div className="inventoryProductsTableListItemsDivs">{item.amountUnit}</div>
                                <div className="inventoryProductsTableListItemsDivs">{item.price}</div>
                                <div className="inventoryProductsTableListItemsDivs">{item.stockQty}</div>
                                <div className="inventoryProductsTableListItemsDivs">{item.totalPrice}</div>
                            </div>
                        ))}



                    </div>

                </div>

            </div>

        </div>

    );

}

export default Inventory;