import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import "./OrderProcess.css";
import TopbarCustomer from '../../Components/TopbarCustomer';
import EmployeeStatusBanner from '../../Components/EmployeeStatusBanner';
import { useAuth } from '../../Context/AuthContext';
import "./CustomerPOV.css";
import api from '../../api';

const styles = {
  container: {
    minHeight: "100vh",
    background: "#f2efe3",
    fontFamily: "Cormorant Garamond, serif",
    color: "#444",
    margin: "0",
    padding: "40px 24px",
  },
  header: {
    maxWidth: '1200px',
    margin: '0 auto',
    marginBottom: '40px',
    textAlign: 'center'
  },
  title: {
    fontSize: '36px',
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: '16px'
  },
  subtitle: {
    fontSize: '18px',
    color: '#6c757d',
    maxWidth: '600px',
    margin: '0 auto'
  },
  steps: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '40px'
  },
  step: {
    flex: 1,
    textAlign: "center",
    padding: "20px",
    position: "relative",
    backgroundColor: "#f0f0f0",
  },
  stepNumber: {
    width: "30px",
    height: "30px",
    borderRadius: "50%",
    background: "#696a8f",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 16px",
    fontSize: "12px",
    fontWeight: "600",
  },
  stepTitle: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: "8px",
  },
  stepDescription: {
    fontSize: "12px",
    color: "#6c757d",
  },
  form: {
    width: "100%",
    margin: "0 auto",
    background: "#fff",
    padding: "40px",
    borderRadius: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  },
  formGroup: {
    width: "100%",
    marginBottom: "24px",
  },
  label: {
    width: "100%",
    display: "block",
    fontSize: "16px",
    fontWeight: "500",
    color: "#2c3e50",
    marginBottom: "8px",

  },
  input: {
    width: '100%',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '16px',
    '&:focus': {
      outline: 'none',
      borderColor: '#4a90e2'
    }
  },
  select: {
    width: '100%',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '16px',
    background: '#fff',
    '&:focus': {
      outline: 'none',
      borderColor: '#4a90e2'
    }
  },
  button: {
    padding: '12px 32px',
    background: '#4a90e2',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.3s ease',
    '&:hover': {
      background: '#357abd'
    }
  }
};

export default function OrderProcess() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [currentConCat, setCurrentConCat] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [modalCategory, setModalCategory] = useState('');
  const [formData, setFormData] = useState({

    weddingDate: "",
    expectedDeliveryDate: "",
    guestCount: "",
    style: "",
    specialRequests: "",

  });
  const [selectedPackaging, setSelectedPackaging] = useState([]);
  const [selectedBeverages, setSelectedBeverages] = useState([]);
  const [selectedFood, setSelectedFood] = useState([]);
  const [selectedKitchenware, setSelectedKitchenware] = useState([]);
  const [selectedHomeDecor, setSelectedHomeDecor] = useState([]);
  const [selectedFaceAndBody, setSelectedFaceAndBody] = useState([]);
  const [selectedClothing, setSelectedClothing] = useState([]);
  const [selectedCustomization, setSelectedCustomization] = useState([]);
  const [selectedOthers, setSelectedOthers] = useState([]);
  const [customProducts, setCustomProducts] = useState({
    packaging: false,
    beverages: false,
    food: false,
    kitchenware: false,
    homeDecor: false,
    faceAndBody: false,
    clothing: false,
    customization: false,
    others: false
  });
  const [customProductDetails, setCustomProductDetails] = useState({
    packaging: { name: 'Own Product', description: 'Packaging', image: null },
    beverages: { name: 'Own Product', description: 'Beverages', image: null },
    food: { name: 'Own Product', description: 'Food', image: null },
    kitchenware: { name: 'Own Product', description: 'Kitchenware', image: null },
    homeDecor: { name: 'Own Product', description: 'Home Decor', image: null },
    faceAndBody: { name: 'Own Product', description: 'Face and Body', image: null },
    clothing: { name: 'Own Product', description: 'Clothing and Accessories', image: null },
    customization: { name: 'Own Product', description: 'Custom Addition', image: null },
    others: { name: 'Own Product', description: 'Others', image: null }
  });
  const [selectedStyle, setSelectedStyle] = useState('');
  const [loading, setLoading] = useState(false);
  // OTP modal state
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [resendAvailableAt, setResendAvailableAt] = useState(null);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [pendingOrderPayload, setPendingOrderPayload] = useState(null);
  const resendTimerRef = useRef(null);

  // Authentication and inventory state
  const { user } = useAuth();
  const [inventoryProducts, setInventoryProducts] = useState([]);
  const [availableProducts, setAvailableProducts] = useState({
    packaging: [],
    beverages: [],
    food: [],
    kitchenware: [],
    homeDecor: [],
    faceAndBody: [],
    clothing: [],
    customization: [],
    others: []
  });
  const [showProductSelection, setShowProductSelection] = useState(false);
  const [selectedInventoryProducts, setSelectedInventoryProducts] = useState({
    packaging: [],
    beverages: [],
    food: [],
    kitchenware: [],
    homeDecor: [],
    faceAndBody: [],
    clothing: [],
    customization: [],
    others: []
  });

  // Fetch inventory products
  useEffect(() => {
    const fetchInventoryProducts = async () => {
      try {
        console.log('Fetching inventory products...');
        const response = await api.get('/api/inventory');
        console.log('Full API response:', response.data);
        
        // The API returns { success: true, inventory: [products...] }
        const products = response.data.inventory || response.data;
        console.log('Extracted products:', products);
        console.log('Number of products fetched:', products?.length || 0);
        
        setInventoryProducts(products);
        console.log('Inventory products set in state');
      } catch (error) {
        console.error('Error fetching inventory products:', error);
      }
    };

    fetchInventoryProducts();
  }, []);

  // On mount, fetch staff-managed available inventory so all users see the same options
  useEffect(() => {
    const fetchAvailable = async () => {
      try {
        const res = await api.get('/api/available-inventory');
        const available = res.data?.available || {};
        setSelectedInventoryProducts({
          packaging: available.packaging?.map(p => p.sku) || [],
          beverages: available.beverages?.map(p => p.sku) || [],
          food: available.food?.map(p => p.sku) || [],
          kitchenware: available.kitchenware?.map(p => p.sku) || [],
          homeDecor: available.homeDecor?.map(p => p.sku) || [],
          faceAndBody: available.faceAndBody?.map(p => p.sku) || [],
          clothing: available.clothing?.map(p => p.sku) || [],
          customization: available.customization?.map(p => p.sku) || [],
          others: available.others?.map(p => p.sku) || []
        });
      } catch (err) {
        console.warn('Failed to fetch available inventory; defaulting to empty', err?.message || err);
      }
    };
    fetchAvailable();
  }, []);

  const saveAvailableInventory = async () => {
    try {
      await api.put('/api/available-inventory', { available: selectedInventoryProducts });
      toast.success('Available products saved');
    } catch (err) {
      console.error('Failed to save available inventory', err);
      toast.error('Failed to save available products');
    }
  };

  // Map inventory categories to UI categories
  const mapInventoryCategory = (category) => {
    const categoryMap = {
      // Packaging categories
      'packaging': 'packaging',
      
      // Beverage categories
      'beverage': 'beverages', 
      'beverages': 'beverages',
      
      // Food categories
      'food': 'food',
      'fresh produce': 'food',
      'snacks': 'food',
      'canned goods': 'food',
      'bakery': 'food',
      'dairy & eggs': 'food',
      'meat & seafood': 'food',
      'frozen foods': 'food',
      'international foods': 'food',
      'organic & natural': 'food',
      
      // Kitchenware categories
      'kitchen': 'kitchenware',
      'kitchenware': 'kitchenware',
      'cookware': 'kitchenware',
      'tableware': 'kitchenware',
      'barware': 'kitchenware',
      
      // Home Decor categories
      'home': 'homeDecor',
      'decor': 'homeDecor',
      'homedecor': 'homeDecor',
      'home decor': 'homeDecor',
      'home appliances': 'homeDecor',
      'lighting': 'homeDecor',
      'wall art': 'homeDecor',
      'rugs & carpets': 'homeDecor',
      'curtains & blinds': 'homeDecor',
      'bedding': 'homeDecor',
      'office furniture': 'homeDecor',
      
      // Face & Body categories
      'face': 'faceAndBody',
      'body': 'faceAndBody',
      'faceandbody': 'faceAndBody',
      'face & body': 'faceAndBody',
      'cosmetics': 'faceAndBody',
      'beauty & personal care': 'faceAndBody',
      'health & wellness': 'faceAndBody',
      'perfume & fragrances': 'faceAndBody',
      'hair care': 'faceAndBody',
      'skincare': 'faceAndBody',
      'bath & body': 'faceAndBody',
      'health devices': 'faceAndBody',
      'supplements': 'faceAndBody',
      'vitamins': 'faceAndBody',
      'first aid': 'faceAndBody',
      'personal safety': 'faceAndBody',
      'baby care': 'faceAndBody',
      'maternity': 'faceAndBody',
      
      // Clothing & Accessories categories
      'clothing': 'clothing',
      'accessories': 'clothing',
      'clothing & accessories': 'clothing',
      "men's clothing": 'clothing',
      "women's clothing": 'clothing',
      "kids' clothing": 'clothing',
      'shoes': 'clothing',
      'accessories (bags, wallets)': 'clothing',
      'jewelry': 'clothing',
      'watches': 'clothing',
      'underwear & sleepwear': 'clothing',
      'activewear': 'clothing',
      'formal wear': 'clothing',
      'jewelry & accessories': 'clothing',
      'watches & wearables': 'clothing',
      'bags & luggage': 'clothing',
      'eyewear': 'clothing',
      
      // Customization categories
      'custom': 'customization',
      'customization': 'customization',
      'seasonal': 'customization',
      'gift items': 'customization',
      'souvenirs': 'customization',
      'party supplies': 'customization',
      
      // Office/Stationery categories - map to packaging for now
      'office supplies': 'packaging',
      'stationery': 'packaging',
      'art supplies': 'packaging',
      'school supplies': 'packaging',
      
      // Electronics and other categories - map to others
      'electronics': 'others',
      'toys & games': 'others',
      'sports & outdoors': 'others',
      'automotive': 'others',
      'pet supplies': 'others',
      'pet food': 'others',
      'pet accessories': 'others',
      'gaming consoles': 'others',
      'books': 'others',
      'music': 'others',
      'movies & tv': 'others',
      'others': 'others'
    };
    const mapped = categoryMap[category?.toLowerCase()] || 'others';
    console.log(`Category mapping: "${category}" -> "${mapped}"`);
    return mapped;
  };

  // Get current available products for each category
  const getAvailableProductsForCategory = (category) => {
    const selected = selectedInventoryProducts[category] || [];
    return selected.map(productSku => {
      const product = inventoryProducts.find(p => p.sku === productSku);
      if (product) {
        return {
          id: product.id,
          name: product.name,
          description: product.description || '',
          image: product.image_data ? `data:image/jpeg;base64,${product.image_data}` : '/Assets/Images/Products/placeholder.png',
          sku: product.sku,
          price: product.price
        };
      }
      return null;
    }).filter(Boolean);
  };

  // Function to clear selected inventory products
  const clearSelectedInventoryProducts = () => {
    const emptyState = {
      packaging: [],
      beverages: [],
      food: [],
      kitchenware: [],
      homeDecor: [],
      faceAndBody: [],
      clothing: [],
      customization: [],
      others: []
    };
    setSelectedInventoryProducts(emptyState);
  };

  // Dynamic product arrays based on employee-selected inventory
  const packagingOptions = getAvailableProductsForCategory('packaging') || [];
  const contentBeverageOptions = getAvailableProductsForCategory('beverages') || [];
  const contentFoodOptions = getAvailableProductsForCategory('food') || [];
  const contentKitchenwareOptions = getAvailableProductsForCategory('kitchenware') || [];
  const contentHomeDecorOptions = getAvailableProductsForCategory('homeDecor') || [];
  const contentFaceAndBodyOptions = getAvailableProductsForCategory('faceAndBody') || [];
  const contentClothingAndAccessoriesOptions = getAvailableProductsForCategory('clothing') || [];
  const customizationOptions = getAvailableProductsForCategory('customization') || [];
  const othersOptions = getAvailableProductsForCategory('others') || [];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePackagingSelect = (option) => {
    setSelectedPackaging(prev => {
      if (prev.includes(option.name)) {
        return prev.filter(name => name !== option.name);
      } else {
        return [...prev, option.name];
      }
    });
  };

  const handleBeverageSelect = (option) => {
    setSelectedBeverages(prev => {
      if (prev.includes(option.name)) {
        return prev.filter(name => name !== option.name);
      } else {
        return [...prev, option.name];
      }
    });
  };

  const handleFoodSelect = (option) => {
    setSelectedFood(prev => {
      if (prev.includes(option.name)) {
        return prev.filter(name => name !== option.name);
      } else {
        return [...prev, option.name];
      }
    });
  };

  const handleKitchenwareSelect = (option) => {
    setSelectedKitchenware(prev => {
      if (prev.includes(option.name)) {
        return prev.filter(name => name !== option.name);
      } else {
        return [...prev, option.name];
      }
    });
  };

  const handleHomeDecorSelect = (option) => {
    setSelectedHomeDecor(prev => {
      if (prev.includes(option.name)) {
        return prev.filter(name => name !== option.name);
      } else {
        return [...prev, option.name];
      }
    });
  };

  const handleFaceAndBodySelect = (option) => {
    setSelectedFaceAndBody(prev => {
      if (prev.includes(option.name)) {
        return prev.filter(name => name !== option.name);
      } else {
        return [...prev, option.name];
      }
    });
  };

  const handleClothingSelect = (option) => {
    setSelectedClothing(prev => {
      if (prev.includes(option.name)) {
        return prev.filter(name => name !== option.name);
      } else {
        return [...prev, option.name];
      }
    });
  };

  const handleCustomizationSelect = (option) => {
    setSelectedCustomization(prev => {
      if (prev.includes(option.name)) {
        return prev.filter(name => name !== option.name);
      } else {
        return [...prev, option.name];
      }
    });
  };

  const handleOthersSelect = (option) => {
    setSelectedOthers(prev => {
      if (prev.includes(option.name)) {
        return prev.filter(name => name !== option.name);
      } else {
        return [...prev, option.name];
      }
    });
  };

  const handleStepClick = (stepNumber) => {
    setCurrentStep(stepNumber);
  };

  const handleContentCategoryClick = (conCatNumber) => {
    setCurrentConCat(conCatNumber);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem('customerToken');
    const customerData = JSON.parse(localStorage.getItem('customer'));

    if (!token || !customerData) {
      alert('you need to login first');
      navigate('/customer-login');
      return;
    }

    setLoading(true);
    try {
      const guestQuantity = parseInt(formData.guestCount, 10) || 1;
      let productsForOrder = [];

      const productNameToSku = {
        "Blanc Box": "BC2350932997462", "Signature Box": "BC8201847934939", "Premium Box": "BC3344504438612",
        "Local Coffee": "BC2694066629240", "Loose-leaf Tea": "BC132199117773", "Beer": "BC6208869646455",
        "Mini Wine": "BC6757578736643", "Mini Whiskey": "BC3887477589362", "Full-sized Wine": "BC1321769559491",
        "Full-sized Spirits/Liquor": "BC7247486312457", "Tablea de Cacao": "BC3186447262236", "Tablea": "BC3186447262236",
        "Sweet Pastries & Cookies": "BC6504520384101", "French Macarons": "BC2963086375030",
        "Artisanal Chocolate bar": "BC352716219829", "Custom Sugar Cookies": "BC8241518941445",
        "Organic Raw Honey": "BC8767512856380", "Infused Salt": "BC2160387016651", "Super Seeds & Nuts": "BC5968201169394",
        "Cheese Knives": "BC4520175179555", "Champagne Flute": "BC8137496597892", "Stemless Wine Glass": "BC8790157063642",
        "Tea Infuser": "BC6290184562919", "Whiskey Glass": "BC9173714065328", "Beer Mug": "BC6932939746925",
        "Mug": "BC6534577553291", "Wooden Coaster": "BC6878103181476",
        "Scented Candle": "BC3616708759217", "Reed Difuser": "BC343941550747", "Room & Linen Spray": "BC8317480767987",
        "Artisanal Soap": "BC3213216763921", "Aromatherapy Hand Wash": "BC9787162074680",
        "Solid Lotion bar": "BC6739184583665", "Pomade": "BC2620000656869", "Bath Soak": "BC2742264316931",
        "Sugar Body Polish": "BC3613916221081",
        "Satin Robe": "BC7663681213353", "Men's Satin Robe": "BC671943150722", "Satin Headband": "BC9879107744493",
        "Crystal Stacker": "BC7429663734593", "Custom Clay Earrings": "BC8964056704789",
        "Wax-sealed Letter": "BC7894930788030", "Decal Sticker": "BC2804181838933", "Logo Engraving": "BC7681940021375",
        "Ribbon Color": "BC5471591644762", "Envelope": "BC7771541356794",
        "Wellsmith sprinkle": "BC913143711469", "palapa seasoning": "BC883738015619",
      };

      // Use inventory-based products for style selection
      const getStyleProducts = (styleName) => {
        // Map style names to category preferences
        const styleMap = {
          "Modern Romantic": ['packaging', 'beverages', 'food'],
          "Bohemian Chic": ['homeDecor', 'faceAndBody', 'customization'],
          "Classic Elegance": ['beverages', 'kitchenware', 'clothing'],
          "Minimalist Modern": ['packaging', 'kitchenware', 'faceAndBody']
        };
        
        const categories = styleMap[styleName] || ['packaging'];
        let products = [];
        
        categories.forEach(category => {
          const categoryProducts = getAvailableProductsForCategory(category);
          products.push(...categoryProducts.slice(0, 2)); // Take first 2 products from each category
        });
        
        return products;
      };

      if (formData.style) {
        const selectedStyleProducts = getStyleProducts(formData.style);
        if (selectedStyleProducts && selectedStyleProducts.length > 0) {
          productsForOrder = selectedStyleProducts.map(styleItem => {
            // For inventory products, use the SKU directly from the database
            let sku = styleItem.sku;
            
            // Only fall back to hardcoded mapping if no SKU is available
            if (!sku) {
              sku = productNameToSku[styleItem.name] || `INV_${styleItem.id}`;
            }
            
            if (!sku) {
              console.warn(`SKU not found for item '${styleItem.name}' in style '${formData.style}'. Item will be skipped.`);
              return null;
            }
            return {
              name: styleItem.name,
              quantity: guestQuantity,
              sku: sku
            };
          }).filter(Boolean);
        } else {
          console.warn(`Style '${formData.style}' selected but no items found or style data is invalid. Falling back to customer-selected items if any.`);
          // Fall back to items the customer actually selected in the UI
            productsForOrder = getAllSelectedItems().map(item => {
              let sku = item.sku;
              if (!sku) sku = productNameToSku[item.name];
              if (!sku) {
                alert(`Product '${item.name}' (handpicked fallback) does not have a matching SKU and will not be included.`);
                return null;
              }
              return { name: item.name, quantity: guestQuantity, sku };
            }).filter(Boolean);
          }
      } else { 
        // Build from customer-selected items only
        productsForOrder = getAllSelectedItems().map(item => {
          let sku = item.sku;
          if (!sku) sku = productNameToSku[item.name];
          if (!sku) {
            alert(`Product '${item.name}' does not have a matching SKU and will not be included in the order.`);
            return null;
          }
          return { name: item.name, quantity: guestQuantity, sku };
        }).filter(Boolean);
      }

      // De-duplicate by SKU to avoid accidental duplicates
      const seenSkus = new Set();
      productsForOrder = productsForOrder.filter(p => {
        if (!p || !p.sku) return false;
        if (seenSkus.has(p.sku)) return false;
        seenSkus.add(p.sku);
        return true;
      });

      if (!productsForOrder || productsForOrder.length === 0) {
        alert('No products selected or available for the order. Please select items or a valid style.');
        setLoading(false);
        return;
      }

      // Debug logging to help troubleshoot SKU issues
      console.log('Products for order:', productsForOrder);
      productsForOrder.forEach(product => {
        console.log(`Product: ${product.name}, SKU: ${product.sku}`);
      });

      // Log the complete order payload being sent to server
      console.log('Complete order payload:', {
        account_name: customerData.account_name || 'Guest',
        name: customerData.name || 'Guest',
        order_date: new Date().toISOString().split('T')[0],
        expected_delivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'Pending',
        package_name: selectedStyle || 'Custom',
        payment_method: 'Cash on Delivery',
        payment_type: 'Cash',
        shipped_to: customerData.name || 'Guest',
        shipping_address: customerData.address || 'TBD',
        total_cost: 0,
        remarks: formData.specialRequests || '',
        telephone: customerData.telephone || '',
        cellphone: customerData.cellphone || '',
        email_address: customerData.email_address || '',
        products: productsForOrder
      });

      let shippingAddress = '';
      if (customerData.street && customerData.street !== '') shippingAddress += customerData.street;
      if (customerData.city && customerData.city !== '') shippingAddress += (shippingAddress ? ', ' : '') + customerData.city;
      if (customerData.zipcode && customerData.zipcode !== '') shippingAddress += (shippingAddress ? ', ' : '') + customerData.zipcode;
      if (!shippingAddress) shippingAddress = 'Default Address'; 

      const orderPayload = {
        name: customerData.name || 'Customer Order',
        account_name: customerData.name || 'Customer Account',
        order_date: new Date().toISOString().split('T')[0],
        expected_delivery: formData.expectedDeliveryDate,
        status: 'Pending',
        payment_type: 'Pending',
        payment_method: 'Pending',
        shipped_to: customerData.name || 'Customer',
        shipping_address: shippingAddress,
        total_cost: 0, 
        remarks: formData.specialRequests || '',
        telephone: customerData.telephone || customerData.phone_number || 'N/A',
        cellphone: customerData.cellphone || customerData.phone_number || 'N/A',
        email_address: customerData.email,
        order_quantity: guestQuantity, 
        package_name: formData.style || "Handpick",
        products: productsForOrder,
      };

      // Save payload and show OTP modal immediately. Then attempt to send OTP.
      setPendingOrderPayload(orderPayload);
      setOtpError('');
      setOtpModalVisible(true);

      if (!customerData.email) {
        setOtpError('No email available for this account. Please update your profile.');
      } else {
        try {
          await sendOtp(customerData.email, token);
          toast.info('An OTP has been sent to your email. Please enter it to confirm your order.');
        } catch (otpErr) {
          console.error('Failed to send OTP:', otpErr);
          // show error inside modal but keep modal open so user may resend
          setOtpError('Failed to send OTP. Please try Resend or check your email.');
        }
      }
    } catch (error) {
      console.error('Error submitting order:', error);
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        localStorage.removeItem('customerToken');
        localStorage.removeItem('customer');
        alert('you need to login first');
        navigate('/customer-login');
      } else {
        const errorMessage = error.response?.data?.message || error.message;
        alert('Failed to submit order: ' + errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditCategory = (category) => {
    setModalCategory(category);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setModalCategory('');
  };

  const handleCustomProductToggle = (category) => {
    setCustomProducts(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const handleCustomProductEdit = (category, field, value) => {
    setCustomProductDetails(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  };

  const handleCustomImageUpload = (category, event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomProductDetails(prev => ({
          ...prev,
          [category]: {
            ...prev[category],
            image: reader.result
          }
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const getAllSelectedItems = () => {
    const items = [];
    
    // Add custom products if they are selected
    Object.entries(customProducts).forEach(([category, isSelected]) => {
      if (isSelected) {
        items.push({
          ...customProductDetails[category],
          category,
          isCustom: true
        });
      }
    });

    // Add regular selected items
    selectedPackaging.forEach(name => {
      const item = (packagingOptions || []).find(opt => opt.name === name);
      if (item) items.push({ ...item, category: 'packaging' });
    });

    selectedBeverages.forEach(name => {
      const item = (contentBeverageOptions || []).find(opt => opt.name === name);
      if (item) items.push({ ...item, category: 'beverages' });
    });

    selectedFood.forEach(name => {
      const item = (contentFoodOptions || []).find(opt => opt.name === name);
      if (item) items.push({ ...item, category: 'food' });
    });

    selectedKitchenware.forEach(name => {
      const item = (contentKitchenwareOptions || []).find(opt => opt.name === name);
      if (item) items.push({ ...item, category: 'kitchenware' });
    });

    selectedHomeDecor.forEach(name => {
      const item = (contentHomeDecorOptions || []).find(opt => opt.name === name);
      if (item) items.push({ ...item, category: 'homedecor' });
    });

    selectedFaceAndBody.forEach(name => {
      const item = (contentFaceAndBodyOptions || []).find(opt => opt.name === name);
      if (item) items.push({ ...item, category: 'faceandbody' });
    });

    selectedClothing.forEach(name => {
      const item = (contentClothingAndAccessoriesOptions || []).find(opt => opt.name === name);
      if (item) items.push({ ...item, category: 'clothing' });
    });

    selectedCustomization.forEach(name => {
      const item = (customizationOptions || []).find(opt => opt.name === name);
      if (item) items.push({ ...item, category: 'customization' });
    });

    selectedOthers.forEach(name => {
      const item = (othersOptions || []).find(opt => opt.name === name);
      if (item) items.push({ ...item, category: 'others' });
    });

    return items;
  };

  const renderModal = () => {
    if (!showModal) return null;

    const renderCategoryContent = () => {
      const allItems = [
        ...(packagingOptions || []).map(item => ({ ...item, category: 'packaging' })),
        ...(contentBeverageOptions || []).map(item => ({ ...item, category: 'beverages' })),
        ...(contentFoodOptions || []).map(item => ({ ...item, category: 'food' })),
        ...(contentKitchenwareOptions || []).map(item => ({ ...item, category: 'kitchenware' })),
        ...(contentHomeDecorOptions || []).map(item => ({ ...item, category: 'homedecor' })),
        ...(contentFaceAndBodyOptions || []).map(item => ({ ...item, category: 'faceandbody' })),
        ...(contentClothingAndAccessoriesOptions || []).map(item => ({ ...item, category: 'clothing' })),
        ...(customizationOptions || []).map(item => ({ ...item, category: 'customization' })),
        ...(othersOptions || []).map(item => ({ ...item, category: 'others' }))
      ];

      const selectedItems = getAllSelectedItems();
      const unselectedItems = allItems.filter(item => 
        !selectedItems.some(selected => 
          selected.name === item.name && selected.category === item.category
        )
      );

      const handleRemoveItem = (item) => {
        if (item.isCustom) {
          setCustomProducts(prev => ({
            ...prev,
            [item.category]: false
          }));
        } else {
          switch(item.category) {
            case 'packaging':
              setSelectedPackaging(prev => prev.filter(name => name !== item.name));
              break;
            case 'beverages':
              setSelectedBeverages(prev => prev.filter(name => name !== item.name));
              break;
            case 'food':
              setSelectedFood(prev => prev.filter(name => name !== item.name));
              break;
            case 'kitchenware':
              setSelectedKitchenware(prev => prev.filter(name => name !== item.name));
              break;
            case 'homedecor':
              setSelectedHomeDecor(prev => prev.filter(name => name !== item.name));
              break;
            case 'faceandbody':
              setSelectedFaceAndBody(prev => prev.filter(name => name !== item.name));
              break;
            case 'clothing':
              setSelectedClothing(prev => prev.filter(name => name !== item.name));
              break;
            case 'customization':
              setSelectedCustomization(prev => prev.filter(name => name !== item.name));
              break;
          }
        }
      };

      const handleAddItem = (item) => {
        switch(item.category) {
          case 'packaging':
            setSelectedPackaging(prev => [...prev, item.name]);
            break;
          case 'beverages':
            setSelectedBeverages(prev => [...prev, item.name]);
            break;
          case 'food':
            setSelectedFood(prev => [...prev, item.name]);
            break;
          case 'kitchenware':
            setSelectedKitchenware(prev => [...prev, item.name]);
            break;
          case 'homedecor':
            setSelectedHomeDecor(prev => [...prev, item.name]);
            break;
          case 'faceandbody':
            setSelectedFaceAndBody(prev => [...prev, item.name]);
            break;
          case 'clothing':
            setSelectedClothing(prev => [...prev, item.name]);
            break;
          case 'customization':
            setSelectedCustomization(prev => [...prev, item.name]);
            break;
        }
      };

      return (
        <div style={{ padding: "20px" }}>
          <h3 style={{ color: "#2c3e50", marginBottom: "20px" }}>Selected Items</h3>
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginBottom: "40px" }}>
            {selectedItems.map((item, index) => (
              <div 
                key={`selected-${item.category}-${index}`}
                className="packagingOptions" 
                style={{
                  border: "2px solid #f0f0f0", 
                  borderRadius: "12px", 
                  padding: "20px", 
                  maxWidth: "32.4%",
                  flexShrink: 0,
                  position: "relative"
                }}
              >
                <button
                  onClick={() => handleRemoveItem(item)}
                  style={{
                    position: "absolute",
                    top: "-10px",
                    right: "-10px",
                    width: "24px",
                    height: "24px",
                    backgroundColor: "#e74c3c",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontWeight: "bold",
                    fontSize: "16px",
                    border: "none",
                    cursor: "pointer",
                    padding: 0
                  }}
                >
                  ×
                </button>
                <div className="packagingImage">
                  {item.isCustom ? (
                    <div style={{ position: 'relative' }}>
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          style={{ width: '100%', height: 'auto' }}
                        />
                      ) : (
                        <div style={{
                          width: '100%',
                          height: '150px',
                          border: '2px dashed #ccc',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#f8f9fa'
                        }}>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleCustomImageUpload(item.category, e)}
                            style={{
                              position: 'absolute',
                              width: '100%',
                              height: '100%',
                              opacity: 0,
                              cursor: 'pointer'
                            }}
                          />
                          <span style={{ color: '#6c757d' }}>Click to upload image</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <img
                      src={item.image}
                      alt={`${item.name} - ${item.description}`}
                      className={item.name.toLowerCase().replace(" ", "")}
                    />
                  )}
                </div>
                {item.isCustom ? (
                  <>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleCustomProductEdit(item.category, 'name', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        marginBottom: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                      }}
                    />
                    <input
                      type="text"
                      value={item.description}
                      // onChange={(e) => handleCustomProductEdit(item.category, 'description', e.target.value)}
                      readOnly
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontStyle: 'italic',
                        fontSize: '12px'
                      }}
                    />
                  </>
                ) : (
                  <>
                    <h4>{item.name}</h4>
                    <p style={{ fontStyle: "italic", fontSize: "12px"}}>{item.description}</p>
                  </>
                )}
              </div>
            ))}
          </div>

          <h3 style={{ color: "#2c3e50", marginBottom: "20px" }}>Available Items</h3>
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            {unselectedItems.map((item, index) => (
              <div 
                key={`unselected-${item.category}-${index}`}
                className="packagingOptions" 
                style={{
                  border: "2px solid #f0f0f0", 
                  borderRadius: "12px", 
                  padding: "20px", 
                  maxWidth: "32.4%",
                  flexShrink: 0,
                  position: "relative",
                  cursor: "pointer"
                }}
                onClick={() => handleAddItem(item)}
              >
                <div className="packagingImage">
                  <img
                    src={item.image}
                    alt={`${item.name} - ${item.description}`}
                    className={item.name.toLowerCase().replace(" ", "")}
                  />
                </div>
                <h4>{item.name}</h4>
                <p style={{ fontStyle: "italic", fontSize: "12px"}}>{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      );
    };

    return (
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: "white",
          padding: "20px",
          borderRadius: "12px",
          width: "80%",
          maxHeight: "80vh",
          overflowY: "auto"
        }}>
          <div style={{display: "flex", justifyContent: "space-between", marginBottom: "20px"}}>
            <h2 style={{color: "#2c3e50"}}>Edit Selection</h2>
            <div style={{display: "flex", gap: "10px"}}>
              <button 
                onClick={handleCloseModal}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#696a8f",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer"
                }}
              >
                Save Changes
              </button>
              <button 
                onClick={handleCloseModal}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#e74c3c",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
            </div>
          </div>
          {renderCategoryContent()}
        </div>
      </div>
    );
  };

  // OTP helpers
  const sendOtp = async (email, token) => {
    if (!email) {
      setOtpError('Missing email for OTP. Please update your profile.');
      return Promise.reject(new Error('Email missing'));
    }
    try {
      console.log('[OTP] Sending OTP to', email);
      const resp = await api.post('/api/otp/send-otp', { email });
      console.log('[OTP] Send success:', resp.data);
      // Cooldown start (30s)
      const availableAt = Date.now() + 30000;
      setResendAvailableAt(availableAt);
      setResendCountdown(30);
      if (resendTimerRef.current) clearInterval(resendTimerRef.current);
      resendTimerRef.current = setInterval(() => {
        setResendCountdown(prev => {
          if (prev <= 1) {
            clearInterval(resendTimerRef.current);
            resendTimerRef.current = null;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      setOtpError('');
      return resp.data;
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.message;
      console.error('[OTP] sendOtp error status=', status, 'message=', message, err);
      if (status === 429) setOtpError(message || 'Please wait before requesting another OTP.');
      else if (status === 400) setOtpError(message || 'Unable to send OTP. Please check your email.');
      else setOtpError('Server error while sending OTP. Please try later.');
      throw err;
    }
  };

  const verifyOtp = async (email, code, token) => {
    try {
      console.log('[OTP] Verifying code', code, 'for', email);
      const resp = await api.post('/api/otp/verify-otp', { email, code });
      console.log('[OTP] Verification success:', resp.data);
      return resp.data;
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.message;
      console.error('[OTP] verifyOtp error status=', status, 'message=', message, err);
      if (status === 400) setOtpError(message || 'Invalid or expired code.');
      else if (status === 429) setOtpError(message || 'Too many attempts. Request a new code.');
      else setOtpError('Server error verifying code.');
      throw err;
    }
  };

  const handleResendOtp = async () => {
    const token = localStorage.getItem('customerToken');
    const customerData = JSON.parse(localStorage.getItem('customer')) || {};
    if (!token || !customerData.email) return;
    // Only allow if cooldown passed
    if (resendAvailableAt && Date.now() < resendAvailableAt) return;
    try {
  await sendOtp(customerData.email, token);
      toast.info('OTP resent to your email.');
    } catch (err) {
      alert('Failed to resend OTP. Please try again later.');
    }
  };

  const handleVerifyAndPlaceOrder = async () => {
    setOtpError('');
    const token = localStorage.getItem('customerToken');
    const customerData = JSON.parse(localStorage.getItem('customer')) || {};
    if (!pendingOrderPayload) { setOtpError('No pending order found.'); return; }
    if (!otpCode || otpCode.trim().length < 6) { setOtpError('Please enter the 6-digit code.'); return; }
    if (!token) { setOtpError('Session expired. Please log in again.'); return; }
    console.log('[ORDER] Starting verification+placement flow');
    console.log('[ORDER] Pending payload:', JSON.stringify(pendingOrderPayload, null, 2));
    try {
      await verifyOtp(customerData.email, otpCode.trim(), token);
    } catch (verifyErr) {
      console.warn('[ORDER] Verification failed; aborting order placement.');
      return; // otpError already set
    }
    try {
      console.log('[ORDER] OTP verified. Placing order...');
      const response = await api.post('/api/orders', pendingOrderPayload, { headers: { Authorization: `Bearer ${token}` } });
      console.log('[ORDER] Order response:', response.data);
      if (response.data) {
        toast.success('Order placed successfully');
        setOtpModalVisible(false);
        setOtpCode('');
        setPendingOrderPayload(null);
        navigate('/customer/orders');
      }
    } catch (orderErr) {
      const status = orderErr.response?.status;
      const backendMessage = orderErr.response?.data?.error || orderErr.response?.data?.message;
      console.error('[ORDER] Placement failed status=', status, backendMessage, orderErr);
      if (status === 400) setOtpError(backendMessage || 'Order data invalid. Review selections.');
      else if (status === 401) setOtpError('Authorization failed. Please log in again.');
      else setOtpError('Server error placing order. Try again.');
    }
  };

  // cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (resendTimerRef.current) {
        clearInterval(resendTimerRef.current);
        resendTimerRef.current = null;
      }
    };
  }, []);


  const handleStep0CustomProducts = () => {
    setCustomProducts(prev => ({
      ...prev,
      packaging: !prev.packaging,
      beverages: !prev.beverages,
      food: !prev.food,
      kitchenware: !prev.kitchenware,
      homeDecor: !prev.homeDecor,
      faceAndBody: !prev.faceAndBody,
      clothing: !prev.clothing,
      customization: !prev.customization
    }));
  };

  const handleStep1CustomPackaging = () => {
    setCustomProducts(prev => ({
      ...prev,
      packaging: !prev.packaging
    }));
  };

  const handleStep2CustomCategory = (category) => {
    const categoryMap = {
      1: 'beverages',
      2: 'food', 
      3: 'kitchenware',
      4: 'homeDecor',
      5: 'faceAndBody',
      6: 'clothing',
      8: 'others'
    };
    
    const categoryName = categoryMap[category];
    if (categoryName) {
      setCustomProducts(prev => ({
        ...prev,
        [categoryName]: !prev[categoryName]
      }));
    }
  };

  const handleStep3CustomCustomization = () => {
    setCustomProducts(prev => ({
      ...prev,
      customization: !prev.customization
    }));
  };

  const handleStyleChange = (e) => {
    setSelectedStyle(e.target.value);
  };

  const renderStyleItems = () => {
    let items = [];
    switch(selectedStyle) {
      case 'modern-romantic':
        items = getAvailableProductsForCategory('packaging').slice(0, 1); // Show first packaging item as example
        break;
      case 'boho-chic':
        items = getAvailableProductsForCategory('homeDecor').slice(0, 1); // Show first home decor item
        break;
      case 'classic-elegance':
        items = getAvailableProductsForCategory('faceAndBody').slice(0, 1); // Show first face & body item
        break;
      case 'minimalist-modern':
        items = getAvailableProductsForCategory('kitchenware').slice(0, 1); // Show first kitchenware item
        break;
      default:
        return null;
    }

    // If no items available, show placeholder
    if (!items || items.length === 0) {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", textAlign: "center", color: "#666" }}>
          <p>No products available for this style. Employee can add products from inventory.</p>
        </div>
      );
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
          <img 
            src={items[0].image || "/Assets/Images/Products/placeholder.png"} 
            alt={items[0].name || "Style preview"}
            style={{ width: "48%", borderRadius: "8px" }}
          />
          <div style={{ 
            width: "48%", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            borderRadius: "8px",
            color: "#f0f0f0",
            fontSize: "16px",
            fontWeight: "600"
          }}>
            {items[0].name || "Style Preview"}
          </div>
        </div>
        <div 
          style={{ 
            display: "flex", 
            flexDirection: "column", 
            gap: "10px",
            maxHeight: "200px",
            overflowY: "auto",
            padding: "10px",
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            borderRadius: "8px",
            scrollbarWidth: "thin",
            scrollbarColor: "#696a8f #f0f0f0"
          }}
        >
          {items.map((item, index) => (
            <div 
              key={index}
              style={{
                padding: "10px",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                borderRadius: "6px",
                color: "#f0f0f0",
                fontSize: "14px"
              }}
            >
              {item.name}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <ToastContainer />
      <TopbarCustomer />
      <EmployeeStatusBanner />
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Create Your Perfect Gift Box</h1>
        <p style={styles.subtitle}>
          Follow these simple steps to create your custom wedding gift boxes
        </p>
      </div>

      <div style={{padding: "0px 100px 100px 100px"}}>
        <div style={{display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", width: "100%", backgroundColor: "#696a8f", borderRadius: "12px", padding: "20px"}}>
          {/* Steps */}
          <div style={styles.steps}>
            <div 
              style={{
                ...styles.step,
                backgroundColor: currentStep === 0 ? '#696a8f' : '#f0f0f0',
                color: currentStep === 0 ? '#fff' : '#2c3e50',
                border: "1px solid #f0f0f0",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onClick={() => handleStepClick(0)}
            >
              <h3 style={{
                ...styles.stepTitle,
                color: currentStep === 0 ? '#fff' : '#2c3e50'
              }}>Wedding</h3>
              <p style={{
                ...styles.stepDescription,
                color: currentStep === 0 ? '#fff' : '#6c757d'
              }}>Select from our curated wedding styles</p>
            </div>
            <div 
              style={{
                ...styles.step,
                backgroundColor: currentStep === 1 ? '#696a8f' : '#f0f0f0',
                color: currentStep === 1 ? '#fff' : '#2c3e50',
                border: "1px solid #f0f0f0",
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onClick={() => handleStepClick(1)}
            >
              <div style={{
                ...styles.stepNumber,
                background: currentStep === 1 ? '#fff' : '#696a8f',
                color: currentStep === 1 ? '#696a8f' : '#fff'
              }}>1</div>
              <h3 style={{
                ...styles.stepTitle,
                color: currentStep === 1 ? '#fff' : '#2c3e50'
              }}>Choose Your Packaging</h3>
              <p style={{
                ...styles.stepDescription,
                color: currentStep === 1 ? '#fff' : '#6c757d'
              }}>Want to curate your own boxes? Start here!</p>
            </div>
            <div 
              style={{
                ...styles.step,
                backgroundColor: currentStep === 2 ? '#696a8f' : '#f0f0f0',
                color: currentStep === 2 ? '#fff' : '#2c3e50',
                border: "1px solid #f0f0f0",
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onClick={() => handleStepClick(2)}
            >
              <div style={{
                ...styles.stepNumber,
                background: currentStep === 2 ? '#fff' : '#696a8f',
                color: currentStep === 2 ? '#696a8f' : '#fff'
              }}>2</div>
              <h3 style={{
                ...styles.stepTitle,
                color: currentStep === 2 ? '#fff' : '#2c3e50'
              }}>Choose the Contents</h3>
            </div>
            <div 
              style={{
                ...styles.step,
                backgroundColor: currentStep === 3 ? '#696a8f' : '#f0f0f0',
                color: currentStep === 3 ? '#fff' : '#2c3e50',
                border: "1px solid #f0f0f0",
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onClick={() => handleStepClick(3)}
            >
              <div style={{
                ...styles.stepNumber,
                background: currentStep === 3 ? '#fff' : '#696a8f',
                color: currentStep === 3 ? '#696a8f' : '#fff'
              }}>3</div>
              <h3 style={{
                ...styles.stepTitle,
                color: currentStep === 3 ? '#fff' : '#2c3e50'
              }}>Make it Personal</h3>
              <p style={{
                ...styles.stepDescription,
                color: currentStep === 3 ? '#fff' : '#6c757d'
              }}>Add your personal touch</p>
            </div>
            <div 
              style={{
                ...styles.step,
                backgroundColor: currentStep === 4 ? '#696a8f' : '#f0f0f0',
                color: currentStep === 4 ? '#fff' : '#2c3e50',
                border: "1px solid #f0f0f0",
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onClick={() => handleStepClick(4)}
            >
              <div style={{
                ...styles.stepNumber,
                background: currentStep === 4 ? '#fff' : '#696a8f',
                color: currentStep === 4 ? '#696a8f' : '#fff'
              }}>4</div>
              <h3 style={{
                ...styles.stepTitle,
                color: currentStep === 4 ? '#fff' : '#2c3e50'
              }}>Finalize Your Order & Submit!</h3>
            </div>
          </div>

          {/* Step Forms */}
          {currentStep === 0 && (
            <form style={{...styles.form, width: "100%"}} onSubmit={handleSubmit}>
              <div style={{display: "flex", flexDirection: "row", gap: "50px"}}>
                <div style={{width: "50%"}}>

                  <div style={styles.formGroup}>
                    <label style={{...styles.label, color: "#f0f0f0"}}>Wedding Date</label>
                    <input
                      type="date"
                      name="weddingDate"
                      value={formData.weddingDate}
                      onChange={handleInputChange}
                      style={styles.input}
                      required
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={{...styles.label, color: "#f0f0f0"}}>Expected Delivery Date</label>
                    <input
                      type="date"
                      name="expectedDeliveryDate"
                      value={formData.expectedDeliveryDate}
                      onChange={handleInputChange}
                      style={styles.input}
                      required
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={{...styles.label, color: "#f0f0f0"}}>Number of Gift Boxes</label>
                    <input
                      type="number"
                      name="guestCount"
                      value={formData.guestCount}
                      onChange={handleInputChange}
                      style={styles.input}
                      required
                    />
                  </div>
                </div>

                <div style={{width: "50%"}}>
                  <div style={styles.formGroup}>
                    <label style={{...styles.label, color: "#f0f0f0"}}>Preferred Style</label>
                    <select
                      name="style"
                      value={formData.style}
                      onChange={(e) => {
                        handleInputChange(e);
                        handleStyleChange(e);
                      }}
                      style={styles.select}
                      required
                    >
                      <option value="">Select a style</option>
                      <option value="modern-romantic">Modern Romantic</option>
                      <option value="boho-chic">Boho Chic</option>
                      <option value="classic-elegance">Classic Elegance</option>
                      <option value="minimalist-modern">Minimalist Modern</option>
                    </select>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={{...styles.label, color: "#f0f0f0"}}>Special Requests</label>
                    <textarea
                      name="specialRequests"
                      value={formData.specialRequests}
                      onChange={handleInputChange}
                      style={{ ...styles.input, height: "120px" }}
                      placeholder="Any specific requirements or preferences?"
                      cols={50}
                    />
                  </div>

                  <div style={{...styles.formGroup, display: "flex", flexDirection: "row", gap: "5px"}}>
                    <input
                      type="checkbox"
                      checked={Object.values(customProducts).every(Boolean)}
                      onChange={handleStep0CustomProducts}
                    />
                    <label style={{...styles.label, fontSize: "14px", fontWeight: "bold", color: "#f0f0f0"}}>I want to use my own products</label>
                  </div>


                  <button type="submit" style={styles.button}>
                    Submit Order
                  </button>
                </div>

                <div style={{width: "50%"}}>
                  <h3 style={{fontWeight: "bold", color: "#f0f0f0", marginBottom: "20px"}}>Preferred Style Preview</h3>
                  {renderStyleItems()}
                </div>
              </div>
            </form>
          )}
          {currentStep === 1 && (
            <form style={{...styles.form, width: "100%"}} onSubmit={handleSubmit}>
              <div style={{backgroundColor: "#2ECC71", width: "fit-content", padding: "10px", borderRadius: "5px", marginBottom: "20px"}}>
                <p style={{fontSize: "14px", fontWeight: "600", color: "#f0f0f0"}}>You may select multiple options</p>
              </div>

              <div style={{...styles.formGroup, display: "flex", flexDirection: "row", gap: "5px"}}>
                <input
                  type="checkbox"
                  checked={customProducts.packaging}
                  onChange={handleStep1CustomPackaging}
                />
                <label style={{...styles.label, fontSize: "14px", fontWeight: "bold", color: "#2c3e50"}}>I want to use my own packaging</label>
              </div>

              <div style={{
                display: "grid", 
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
                gap: "15px", 
                marginTop: "20px"
              }}>
                {(packagingOptions || []).map((option, index) => (
                  <div 
                    key={index}
                    className="packagingOptions" 
                    style={{
                      border: "2px solid #f0f0f0", 
                      borderRadius: "12px", 
                      padding: "15px", 
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                      position: "relative",
                      minHeight: "200px",
                      display: "flex",
                      flexDirection: "column",
                      backgroundColor: "white"
                    }}
                    onClick={() => handlePackagingSelect(option)}
                  >
                    {selectedPackaging.includes(option.name) && (
                      <div style={{
                        position: "absolute",
                        top: "-10px",
                        right: "-10px",
                        width: "24px",
                        height: "24px",
                        backgroundColor: "#2ECC71",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontWeight: "bold",
                        fontSize: "16px"
                      }}>
                        ✓
                      </div>
                    )}
                    <div className="packagingImage" style={{
                      height: "120px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      marginBottom: "10px"
                    }}>
                      <img
                        src={option.image}
                        alt={`${option.name} - ${option.description}`}
                        className={option.name.toLowerCase().replace(" ", "")}
                        style={{
                          maxHeight: "100%",
                          maxWidth: "100%",
                          objectFit: "contain"
                        }}
                      />
                    </div>
                    <h4>{option.name}</h4>
                    <p style={{ fontStyle: "italic", fontSize: "12px"}}>{option.description}</p>
                  </div>
                ))}
              </div>

              <button type="submit" style={styles.button}>
                Next
              </button>
            </form>
          )}
          {currentStep === 2 && (
            <form style={{...styles.form, width: "100%"}} onSubmit={handleSubmit}>

              {/* Employee Product Management Interface */}
              {user && ['admin', 'business_developer', 'creatives', 'director', 'sales_manager'].includes(user.role) && (
                <div style={{
                  width: "100%",
                  backgroundColor: "#fff3cd",
                  border: "1px solid #ffeaa7",
                  borderRadius: "8px",
                  padding: "20px",
                  marginBottom: "20px"
                }}>
                  <h3 style={{ margin: "0 0 15px 0", color: "#856404" }}>
                    🔧 Staff: Manage Available Products
                  </h3>
                  <p style={{ margin: "0 0 15px 0", color: "#856404", fontSize: "14px" }}>
                    Select which products from inventory should be available for customers to choose from.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowProductSelection(true)}
                    style={{
                      backgroundColor: "#ff6b35",
                      color: "white",
                      border: "none",
                      padding: "10px 20px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "600"
                    }}
                  >
                    📦 Manage Available Products
                  </button>
                  <button
                    type="button"
                    onClick={saveAvailableInventory}
                    style={{
                      marginLeft: "10px",
                      backgroundColor: "#198754",
                      color: "white",
                      border: "none",
                      padding: "10px 20px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "600"
                    }}
                  >
                    💾 Save Available Products
                  </button>
                </div>
              )}

              {/* Content Categories */}
              <div style={styles.steps}>
                <div 
                  style={{
                    ...styles.step,
                    backgroundColor: currentConCat === 1 ? '#696a8f' : '#f0f0f0',
                    color: currentConCat === 1 ? '#fff' : '#2c3e50',
                    border: "1px solid #f0f0f0",
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                  }}
                  onClick={() => handleContentCategoryClick(1)}
                >
                  <div style={{
                    background: currentConCat === 1 ? '#fff' : '#696a8f',
                    color: currentConCat === 1 ? '#696a8f' : '#fff'
                  }}></div>
                  <p style={{
                    ...styles.stepTitle,
                    color: currentConCat === 1 ? '#fff' : '#2c3e50',
                    fontSize: "14px",
                  }}>Beverage</p>
                </div>
                <div 
                  style={{
                    ...styles.step,
                    backgroundColor: currentConCat === 2 ? '#696a8f' : '#f0f0f0',
                    color: currentConCat === 2 ? '#fff' : '#2c3e50',
                    border: "1px solid #f0f0f0",
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onClick={() => handleContentCategoryClick(2)}
                >
                  <div style={{
                    background: currentConCat === 2 ? '#fff' : '#696a8f',
                    color: currentConCat === 2 ? '#696a8f' : '#fff'
                  }}></div>
                  <p style={{
                    ...styles.stepTitle,
                    color: currentConCat === 2 ? '#fff' : '#2c3e50',
                    fontSize: "14px",
                  }}>Food</p>
                </div>
                <div 
                  style={{
                    ...styles.step,
                    backgroundColor: currentConCat === 3 ? '#696a8f' : '#f0f0f0',
                    color: currentConCat === 3 ? '#fff' : '#2c3e50',
                    border: "1px solid #f0f0f0",
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onClick={() => handleContentCategoryClick(3)}
                >
                  <div style={{
                    background: currentConCat === 3 ? '#fff' : '#696a8f',
                    color: currentConCat === 3 ? '#696a8f' : '#fff'
                  }}></div>
                  <p style={{
                    ...styles.stepTitle,
                    color: currentConCat === 3 ? '#fff' : '#2c3e50',
                    fontSize: "14px",
                  }}>Kitchenware</p>
                </div>
                <div 
                  style={{
                    ...styles.step,
                    backgroundColor: currentConCat === 4 ? '#696a8f' : '#f0f0f0',
                    color: currentConCat === 4 ? '#fff' : '#2c3e50',
                    border: "1px solid #f0f0f0",
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onClick={() => handleContentCategoryClick(4)}
                >
                  <div style={{
                    background: currentConCat === 4 ? '#fff' : '#696a8f',
                    color: currentConCat === 4 ? '#696a8f' : '#fff'
                  }}></div>
                  <p style={{
                    ...styles.stepTitle,
                    color: currentConCat === 4 ? '#fff' : '#2c3e50',
                    fontSize: "14px",
                  }}>Home Decor</p>
                </div>
                <div 
                  style={{
                    ...styles.step,
                    backgroundColor: currentConCat === 5 ? '#696a8f' : '#f0f0f0',
                    color: currentConCat === 5 ? '#fff' : '#2c3e50',
                    border: "1px solid #f0f0f0",
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onClick={() => handleContentCategoryClick(5)}
                >
                  <div style={{
                    background: currentConCat === 5 ? '#fff' : '#696a8f',
                    color: currentConCat === 5 ? '#696a8f' : '#fff'
                  }}></div>
                  <p style={{
                    ...styles.stepTitle,
                    color: currentConCat === 5 ? '#fff' : '#2c3e50',
                    fontSize: "14px",
                  }}>Face and Body</p>
                </div>
                <div 
                  style={{
                    ...styles.step,
                    display: "flex",
                    justifyContent: "center",
                    backgroundColor: currentConCat === 6 ? '#696a8f' : '#f0f0f0',
                    color: currentConCat === 6 ? '#fff' : '#2c3e50',
                    border: "1px solid #f0f0f0",
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onClick={() => handleContentCategoryClick(6)}
                >
                  <div style={{
                    background: currentConCat === 6 ? '#fff' : '#696a8f',
                    color: currentConCat === 6 ? '#696a8f' : '#fff'
                  }}></div>
                  <p style={{
                    ...styles.stepTitle,
                    color: currentConCat === 6 ? '#fff' : '#2c3e50',
                    fontSize: "12px",
                  }}>Clothing and Accessories</p>
                </div>
                <div 
                  style={{
                    ...styles.step,
                    display: "flex",
                    justifyContent: "center",
                    backgroundColor: currentConCat === 7 ? '#696a8f' : '#f0f0f0',
                    color: currentConCat === 7 ? '#fff' : '#2c3e50',
                    border: "1px solid #f0f0f0",
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onClick={() => handleContentCategoryClick(7)}
                >
                  <div style={{
                    background: currentConCat === 7 ? '#fff' : '#696a8f',
                    color: currentConCat === 7 ? '#696a8f' : '#fff'
                  }}></div>
                  <p style={{
                    ...styles.stepTitle,
                    color: currentConCat === 7 ? '#fff' : '#2c3e50',
                    fontSize: "12px",
                  }}>Leather Products and Desk Essentials</p>
                </div>
                <div 
                  style={{
                    ...styles.step,
                    backgroundColor: currentConCat === 8 ? '#696a8f' : '#f0f0f0',
                    color: currentConCat === 8 ? '#fff' : '#2c3e50',
                    border: "1px solid #f0f0f0",
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onClick={() => handleContentCategoryClick(8)}
                >
                  <div style={{
                    background: currentConCat === 8 ? '#fff' : '#696a8f',
                    color: currentConCat === 8 ? '#696a8f' : '#fff'
                  }}></div>
                  <p style={{
                    ...styles.stepTitle,
                    color: currentConCat === 8 ? '#fff' : '#2c3e50',
                    fontSize: "14px",
                  }}>Others</p>
                </div>
                
              </div>

              <div style={{backgroundColor: "#2ECC71", width: "fit-content", padding: "10px", borderRadius: "5px", marginBottom: "20px"}}>
                <p style={{fontSize: "14px", fontWeight: "600", color: "#f0f0f0"}}>You may select multiple options</p>
              </div>
              
              {/* Beverage */}
              {currentConCat === 1 && (
                <>
                  <div style={{...styles.formGroup, display: "flex", flexDirection: "row", gap: "5px"}}>
                    <input
                      type="checkbox"
                      checked={customProducts.beverages}
                      onChange={() => handleStep2CustomCategory(1)}
                    />
                    <label style={{...styles.label, fontSize: "14px", fontWeight: "bold", color: "#2c3e50"}}>I want to use my own products for this category</label>
                  </div>

                  <p>MOQ for custom-labelled beer, mini wine, and mini whiskey is 6 pcs.</p>
                  <p>MOQ for custom coffee and tea packaging is 12 pcs.</p>

                  <div style={{
                    display: "grid", 
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
                    gap: "15px", 
                    marginTop: "20px"
                  }}>
                    {(contentBeverageOptions || []).map((option, index) => (
                      <div 
                        key={index}
                        className="packagingOptions" 
                        style={{
                          border: "2px solid #f0f0f0", 
                          borderRadius: "12px", 
                          padding: "15px", 
                          cursor: "pointer",
                          transition: "all 0.3s ease",
                          position: "relative",
                          minHeight: "200px",
                          display: "flex",
                          flexDirection: "column",
                          backgroundColor: "white"
                        }}
                        onClick={() => handleBeverageSelect(option)}
                      >
                        {selectedBeverages.includes(option.name) && (
                          <div style={{
                            position: "absolute",
                            top: "-10px",
                            right: "-10px",
                            width: "24px",
                            height: "24px",
                            backgroundColor: "#2ECC71",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontWeight: "bold",
                            fontSize: "16px"
                          }}>
                            ✓
                          </div>
                        )}
                        <div className="packagingImage" style={{
                          height: "120px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                          marginBottom: "10px"
                        }}>
                          <img
                            src={option.image}
                            alt={`${option.name} - ${option.description}`}
                            className={option.name.toLowerCase().replace(" ", "")}
                            style={{
                              maxHeight: "100%",
                              maxWidth: "100%",
                              objectFit: "contain"
                            }}
                          />
                        </div>
                        <h4>{option.name}</h4>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Food */}
              {currentConCat === 2 && (
                <>
                  <div style={{...styles.formGroup, display: "flex", flexDirection: "row", gap: "5px"}}>
                    <input
                      type="checkbox"
                      checked={customProducts.food}
                      onChange={() => handleStep2CustomCategory(2)}
                    />
                    <label style={{...styles.label, fontSize: "14px", fontWeight: "bold", color: "#2c3e50"}}>I want to use my own products for this category</label>
                  </div>

                  <p>Infused Salts are sold as a set for retail orders.</p>

                  <div style={{
                    display: "grid", 
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
                    gap: "15px", 
                    marginTop: "20px"
                  }}>
                    {(contentFoodOptions || []).map((option, index) => (
                      <div 
                        key={index}
                        className="packagingOptions" 
                        style={{
                          border: "2px solid #f0f0f0", 
                          borderRadius: "12px", 
                          padding: "15px", 
                          cursor: "pointer",
                          transition: "all 0.3s ease",
                          position: "relative",
                          minHeight: "200px",
                          display: "flex",
                          flexDirection: "column",
                          backgroundColor: "white"
                        }}
                        onClick={() => handleFoodSelect(option)}
                      >
                        {selectedFood.includes(option.name) && (
                          <div style={{
                            position: "absolute",
                            top: "-10px",
                            right: "-10px",
                            width: "24px",
                            height: "24px",
                            backgroundColor: "#2ECC71",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontWeight: "bold",
                            fontSize: "16px"
                          }}>
                            ✓
                          </div>
                        )}
                        <div className="packagingImage" style={{
                          height: "120px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                          marginBottom: "10px"
                        }}>
                          <img
                            src={option.image}
                            alt={`${option.name} - ${option.description}`}
                            className={option.name.toLowerCase().replace(" ", "")}
                            style={{
                              maxHeight: "100%",
                              maxWidth: "100%",
                              objectFit: "contain"
                            }}
                          />
                        </div>
                        <h4>{option.name}</h4>
                        <p style={{ fontStyle: "italic", fontSize: "12px"}}>{option.description}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Kitchenware */}
              {currentConCat === 3 && (
                <>
                  <div style={{...styles.formGroup, display: "flex", flexDirection: "row", gap: "5px"}}>
                    <input
                      type="checkbox"
                      checked={customProducts.kitchenware}
                      onChange={() => handleStep2CustomCategory(3)}
                    />
                    <label style={{...styles.label, fontSize: "14px", fontWeight: "bold", color: "#2c3e50"}}>I want to use my own products for this category</label>
                  </div>

                  <p>MOQ for personalized wooden kitchenware is 10 pcs.</p>

                  <div style={{
                    display: "grid", 
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
                    gap: "15px", 
                    marginTop: "20px"
                  }}>
                    {(contentKitchenwareOptions || []).map((option, index) => (
                      <div 
                        key={index}
                        className="packagingOptions" 
                        style={{
                          border: "2px solid #f0f0f0", 
                          borderRadius: "12px", 
                          padding: "15px", 
                          cursor: "pointer",
                          transition: "all 0.3s ease",
                          position: "relative",
                          minHeight: "200px",
                          display: "flex",
                          flexDirection: "column",
                          backgroundColor: "white"
                        }}
                        onClick={() => handleKitchenwareSelect(option)}
                      >
                        {selectedKitchenware.includes(option.name) && (
                          <div style={{
                            position: "absolute",
                            top: "-10px",
                            right: "-10px",
                            width: "24px",
                            height: "24px",
                            backgroundColor: "#2ECC71",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontWeight: "bold",
                            fontSize: "16px"
                          }}>
                            ✓
                          </div>
                        )}
                        <div className="packagingImage" style={{
                          height: "120px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                          marginBottom: "10px"
                        }}>
                          <img
                            src={option.image}
                            alt={`${option.name} - ${option.description}`}
                            className={option.name.toLowerCase().replace(" ", "")}
                            style={{
                              maxHeight: "100%",
                              maxWidth: "100%",
                              objectFit: "contain"
                            }}
                          />
                        </div>
                        <h4>{option.name}</h4>
                        <p style={{ fontStyle: "italic", fontSize: "12px"}}>{option.description}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Home Decor */}
              {currentConCat === 4 && (
                <>
                  <div style={{...styles.formGroup, display: "flex", flexDirection: "row", gap: "5px"}}>
                    <input
                      type="checkbox"
                      checked={customProducts.homeDecor}
                      onChange={() => handleStep2CustomCategory(4)}
                    />
                    <label style={{...styles.label, fontSize: "14px", fontWeight: "bold", color: "#2c3e50"}}>I want to use my own products for this category</label>
                  </div>

                  <div style={{
                    display: "grid", 
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
                    gap: "15px", 
                    marginTop: "20px"
                  }}>
                    {(contentHomeDecorOptions || []).map((option, index) => (
                      <div 
                        key={index}
                        className="packagingOptions" 
                        style={{
                          border: "2px solid #f0f0f0", 
                          borderRadius: "12px", 
                          padding: "15px", 
                          cursor: "pointer",
                          transition: "all 0.3s ease",
                          position: "relative",
                          minHeight: "200px",
                          display: "flex",
                          flexDirection: "column",
                          backgroundColor: "white"
                        }}
                        onClick={() => handleHomeDecorSelect(option)}
                      >
                        {selectedHomeDecor.includes(option.name) && (
                          <div style={{
                            position: "absolute",
                            top: "-10px",
                            right: "-10px",
                            width: "24px",
                            height: "24px",
                            backgroundColor: "#2ECC71",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontWeight: "bold",
                            fontSize: "16px"
                          }}>
                            ✓
                          </div>
                        )}
                        <div className="packagingImage">
                          <img
                            src={option.image}
                            alt={`${option.name} - ${option.description}`}
                            className={option.name.toLowerCase().replace(" ", "")}
                          />
                        </div>
                        <h4>{option.name}</h4>
                        <p style={{ fontStyle: "italic", fontSize: "12px"}}>{option.description}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Face and Body */}
              {currentConCat === 5 && (
                <>
                  <div style={{...styles.formGroup, display: "flex", flexDirection: "row", gap: "5px"}}>
                    <input
                      type="checkbox"
                      checked={customProducts.faceAndBody}
                      onChange={() => handleStep2CustomCategory(5)}
                    />
                    <label style={{...styles.label, fontSize: "14px", fontWeight: "bold", color: "#2c3e50"}}>I want to use my own products for this category</label>
                  </div>

                  <div style={{
                    display: "grid", 
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
                    gap: "15px", 
                    marginTop: "20px"
                  }}>
                    {(contentFaceAndBodyOptions || []).map((option, index) => (
                      <div 
                        key={index}
                        className="packagingOptions" 
                        style={{
                          border: "2px solid #f0f0f0", 
                          borderRadius: "12px", 
                          padding: "15px", 
                          cursor: "pointer",
                          transition: "all 0.3s ease",
                          position: "relative",
                          minHeight: "200px",
                          display: "flex",
                          flexDirection: "column",
                          backgroundColor: "white"
                        }}
                        onClick={() => handleFaceAndBodySelect(option)}
                      >
                        {selectedFaceAndBody.includes(option.name) && (
                          <div style={{
                            position: "absolute",
                            top: "-10px",
                            right: "-10px",
                            width: "24px",
                            height: "24px",
                            backgroundColor: "#2ECC71",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontWeight: "bold",
                            fontSize: "16px"
                          }}>
                            ✓
                          </div>
                        )}
                        <div className="packagingImage">
                          <img
                            src={option.image}
                            alt={`${option.name} - ${option.description}`}
                            className={option.name.toLowerCase().replace(" ", "")}
                          />
                        </div>
                        <h4>{option.name}</h4>
                        <p style={{ fontStyle: "italic", fontSize: "12px"}}>{option.description}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Clothiing and Accessories */}
              {currentConCat === 6 && (
                <>
                  <div style={{...styles.formGroup, display: "flex", flexDirection: "row", gap: "5px"}}>
                    <input
                      type="checkbox"
                      checked={customProducts.clothing}
                      onChange={() => handleStep2CustomCategory(6)}
                    />
                    <label style={{...styles.label, fontSize: "14px", fontWeight: "bold", color: "#2c3e50"}}>I want to use my own products for this category</label>
                  </div>

                  <div style={{
                    display: "grid", 
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
                    gap: "15px", 
                    marginTop: "20px"
                  }}>
                    {(contentClothingAndAccessoriesOptions || []).map((option, index) => (
                      <div 
                        key={index}
                        className="packagingOptions" 
                        style={{
                          border: "2px solid #f0f0f0", 
                          borderRadius: "12px", 
                          padding: "15px", 
                          cursor: "pointer",
                          transition: "all 0.3s ease",
                          position: "relative",
                          minHeight: "200px",
                          display: "flex",
                          flexDirection: "column",
                          backgroundColor: "white"
                        }}
                        onClick={() => handleClothingSelect(option)}
                      >
                        {selectedClothing.includes(option.name) && (
                          <div style={{
                            position: "absolute",
                            top: "-10px",
                            right: "-10px",
                            width: "24px",
                            height: "24px",
                            backgroundColor: "#2ECC71",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontWeight: "bold",
                            fontSize: "16px"
                          }}>
                            ✓
                          </div>
                        )}
                        <div className="packagingImage">
                          <img
                            src={option.image}
                            alt={`${option.name} - ${option.description}`}
                            className={option.name.toLowerCase().replace(" ", "")}
                          />
                        </div>
                        <h4>{option.name}</h4>
                        <p style={{ fontStyle: "italic", fontSize: "12px"}}>{option.description}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Others Category */}
              {currentConCat === 8 && (
                <>
                  <div style={{...styles.formGroup, display: "flex", flexDirection: "row", gap: "5px"}}>
                    <input
                      type="checkbox"
                      checked={customProducts.others}
                      onChange={() => handleStep2CustomCategory(8)}
                    />
                    <label style={{...styles.label, fontSize: "14px", fontWeight: "bold", color: "#2c3e50"}}>I want to use my own products for this category</label>
                  </div>

                  <div style={{
                    display: "grid", 
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
                    gap: "15px", 
                    marginTop: "20px"
                  }}>
                    {(othersOptions || []).map((option, index) => (
                      <div 
                        key={index}
                        className="packagingOptions" 
                        style={{
                          border: "2px solid #f0f0f0", 
                          borderRadius: "12px", 
                          padding: "15px", 
                          cursor: "pointer",
                          transition: "all 0.3s ease",
                          position: "relative",
                          minHeight: "200px",
                          display: "flex",
                          flexDirection: "column",
                          backgroundColor: "white"
                        }}
                        onClick={() => handleOthersSelect(option)}
                      >
                        {selectedOthers.includes(option.name) && (
                          <div style={{
                            position: "absolute",
                            top: "-10px",
                            right: "-10px",
                            width: "24px",
                            height: "24px",
                            backgroundColor: "#2ECC71",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontWeight: "bold",
                            fontSize: "16px"
                          }}>
                            ✓
                          </div>
                        )}
                        <div className="packagingImage">
                          <img
                            src={option.image}
                            alt={`${option.name} - ${option.description}`}
                            className={option.name.toLowerCase().replace(" ", "")}
                          />
                        </div>
                        <h4>{option.name}</h4>
                        <p style={{ fontStyle: "italic", fontSize: "12px"}}>{option.description}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <button type="submit" style={styles.button}>
                Next
              </button>
            </form>
          )}
          {currentStep === 3 && (
            <form style={{...styles.form, width: "100%"}} onSubmit={handleSubmit}>
              <div style={{backgroundColor: "#2ECC71", width: "fit-content", padding: "10px", borderRadius: "5px", marginBottom: "20px"}}>
                <p style={{fontSize: "14px", fontWeight: "600", color: "#f0f0f0"}}>You may select multiple options</p>
              </div>

              <div style={{...styles.formGroup, display: "flex", flexDirection: "row", gap: "5px"}}>
                <input
                  type="checkbox"
                  checked={customProducts.customization}
                  onChange={handleStep3CustomCustomization}
                />
                <label style={{...styles.label, fontSize: "14px", fontWeight: "bold", color: "#2c3e50"}}>I want to use my own products</label>
              </div>

              <div style={{
                display: "grid", 
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
                gap: "15px", 
                marginTop: "20px"
              }}>
                {(customizationOptions || []).map((option, index) => (
                  <div 
                    key={index}
                    className="packagingOptions" 
                    style={{
                      border: "2px solid #f0f0f0", 
                      borderRadius: "12px", 
                      padding: "15px", 
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                      position: "relative",
                      minHeight: "200px",
                      display: "flex",
                      flexDirection: "column",
                      backgroundColor: "white"
                    }}
                    onClick={() => handleCustomizationSelect(option)}
                  >
                    {selectedCustomization.includes(option.name) && (
                      <div style={{
                        position: "absolute",
                        top: "-10px",
                        right: "-10px",
                        width: "24px",
                        height: "24px",
                        backgroundColor: "#2ECC71",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontWeight: "bold",
                        fontSize: "16px"
                      }}>
                        ✓
                      </div>
                    )}
                    <div className="packagingImage">
                      <img
                        src={option.image}
                        alt={`${option.name} - ${option.description}`}
                        className={option.name.toLowerCase().replace(" ", "")}
                      />
                    </div>
                    <h4>{option.name}</h4>
                    <p style={{ fontStyle: "italic", fontSize: "12px"}}>{option.description}</p>
                  </div>
                ))}
              </div>

              <button type="submit" style={styles.button}>
                Next
              </button>
            </form>
          )}
          {currentStep === 4 && (
            <form style={{...styles.form, width: "100%", display: "flex", flexDirection: "row", gap: "50px"}} onSubmit={handleSubmit}>
              <div style={{width: "50%"}}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Wedding Date</label>
                  <input
                    type="date"
                    name="weddingDate"
                    value={formData.weddingDate}
                    onChange={handleInputChange}
                    style={styles.input}
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Expected Delivery Date</label>
                  <input
                    type="date"
                    name="expectedDeliveryDate"
                    value={formData.expectedDeliveryDate}
                    onChange={handleInputChange}
                    style={styles.input}
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Number of Gift Boxes</label>
                  <input
                    type="number"
                    name="guestCount"
                    value={formData.guestCount}
                    onChange={handleInputChange}
                    style={styles.input}
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Special Requests</label>
                  <textarea
                    name="specialRequests"
                    value={formData.specialRequests}
                    onChange={handleInputChange}
                    style={{ ...styles.input, height: "120px" }}
                    placeholder="Any specific requirements or preferences?"
                    cols={50}
                  ></textarea>
                </div>

                <button type="submit" style={styles.button}>
                  Submit Order
                </button>
              </div>

              <div style={{flex: 1, width: "50%"}}>
                <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", width: "100%",}}>
                  <h3 style={{fontWeight: "bold", color: "#2c3e50"}}>Selected Items</h3>
                  <button 
                    onClick={() => handleEditCategory('all')}
                    style={{
                      padding: "4px 8px",
                      backgroundColor: "#696a8f",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "12px"
                    }}
                  >
                    Edit Selection
                  </button>
                </div>

                <p>Select an item to customize.</p>
                
                <div style={{
                  display: "flex",
                  gap: "20px",
                  overflowX: "auto",
                  padding: "10px 0",
                  scrollbarWidth: "thin",
                  scrollbarColor: "#696a8f #f0f0f0"
                }}>
                  {getAllSelectedItems().map((item, index) => (
                    <div 
                      key={`${item.category}-${index}`}
                      className="packagingOptions" 
                      style={{
                        border: "2px solid #f0f0f0", 
                        borderRadius: "12px", 
                        padding: "20px",
                        maxWidth: "32.4%",
                        flexShrink: 0,
                        position: "relative"
                      }}
                    >
                      <div className="packagingImage">
                        <img
                          src={item.image}
                          alt={`${item.name} - ${item.description}`}
                          className={item.name.toLowerCase().replace(" ", "")}
                        />
                      </div>
                      <h4>{item.name}</h4>
                      <p style={{ fontStyle: "italic", fontSize: "12px"}}>{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </form>
          )}
          
          {renderModal()}
          {/* OTP Modal */}
          {otpModalVisible && (
            <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:3000}}>
              <div style={{background:'#fff',width:'420px',borderRadius:12,padding:24,boxShadow:'0 8px 40px rgba(0,0,0,0.2)'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                  <h3 style={{margin:0}}>Enter OTP</h3>
                  <button onClick={() => { setOtpModalVisible(false); setOtpCode(''); setPendingOrderPayload(null); }} style={{background:'transparent',border:'none',fontSize:20,cursor:'pointer'}}>×</button>
                </div>
                <p style={{color:'#666',marginBottom:12}}>We've sent a one-time password to your email. Enter it below to confirm your order.</p>
                <input
                  type="text"
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                  maxLength={6}
                  placeholder="Enter 6-digit code"
                  style={{width:'100%',padding:12,border:'1px solid #ddd',borderRadius:6,marginBottom:8,fontSize:16,letterSpacing:4,textAlign:'center'}}
                />
                {otpError && <div style={{color:'red',marginBottom:8}}>{otpError}</div>}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:8}}>
                  <button onClick={handleVerifyAndPlaceOrder} style={{padding:'10px 18px',background:'#27ae60',color:'#fff',border:'none',borderRadius:6,cursor:'pointer',fontWeight:700}}>Verify & Place Order</button>
                  <div style={{textAlign:'right'}}>
                    <button onClick={handleResendOtp} disabled={resendCountdown > 0} style={{padding:'8px 12px',background:resendCountdown>0? '#ddd' : '#4a90e2',color:resendCountdown>0? '#888' : '#fff',border:'none',borderRadius:6,cursor:resendCountdown>0? 'not-allowed' : 'pointer'}}>
                      {resendCountdown>0 ? `Resend (${resendCountdown}s)` : 'Resend OTP'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Employee Product Selection Modal */}
      {user && ['admin', 'business_developer', 'creatives', 'director', 'sales_manager'].includes(user.role) && showProductSelection && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.75)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: "white",
            borderRadius: "12px",
            padding: "30px",
            maxWidth: "90vw",
            maxHeight: "90vh",
            overflow: "auto",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)"
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "25px"
            }}>
              <h2 style={{ margin: 0, color: "#2c3e50" }}>
                🔧 Staff: Select Available Products
              </h2>
              <button
                onClick={() => setShowProductSelection(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "#666"
                }}
              >
                ×
              </button>
            </div>
            
            <p style={{ marginBottom: "25px", color: "#666" }}>
              Select which products from the inventory should be available for customers to choose from in each category.
            </p>

            {/* Category Tabs */}
            <div style={{
              display: "flex",
              gap: "5px",
              marginBottom: "20px",
              borderBottom: "1px solid #eee"
            }}>
              {[
                { key: 'packaging', label: 'Packaging' },
                { key: 'beverages', label: 'Beverages' },
                { key: 'food', label: 'Food' },
                { key: 'kitchenware', label: 'Kitchenware' },
                { key: 'homeDecor', label: 'Home Decor' },
                { key: 'faceAndBody', label: 'Face & Body' },
                { key: 'clothing', label: 'Clothing' },
                { key: 'customization', label: 'Customization' },
                { key: 'others', label: 'Others' }
              ].map(category => (
                <button
                  key={category.key}
                  onClick={() => setModalCategory(category.key)}
                  style={{
                    padding: "8px 16px",
                    border: "none",
                    background: modalCategory === category.key ? "#ff6b35" : "transparent",
                    color: modalCategory === category.key ? "white" : "#666",
                    borderRadius: "6px 6px 0 0",
                    cursor: "pointer",
                    fontSize: "14px"
                  }}
                >
                  {category.label}
                </button>
              ))}
            </div>

            {/* Product Selection for Current Category */}
            <div style={{ minHeight: "300px" }}>
              <h3 style={{ marginBottom: "15px", textTransform: "capitalize" }}>
                {modalCategory?.replace(/([A-Z])/g, ' $1').trim()} Products
              </h3>

              {(() => {
                if (!Array.isArray(inventoryProducts)) {
                  return (
                    <p style={{ color: "#999", fontStyle: "italic" }}>
                      Loading inventory products...
                    </p>
                  );
                }

                const filteredProducts = inventoryProducts.filter((product) => {
                  const mappedCategory = mapInventoryCategory(
                    (product.category || '').toLowerCase()
                  );
                  return mappedCategory === modalCategory;
                });

                if (filteredProducts.length === 0) {
                  return (
                    <p style={{ color: "#999", fontStyle: "italic" }}>
                      No inventory products found for this category.
                    </p>
                  );
                }

                return (
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                    gap: "15px"
                  }}>
                    {filteredProducts.map((product) => (
                      <div
                        key={product.sku}
                        onClick={() => {
                          const productId = product.sku;
                          const isSelected = selectedInventoryProducts[modalCategory]?.includes(productId);
                          setSelectedInventoryProducts(prev => ({
                            ...prev,
                            [modalCategory]: isSelected
                              ? prev[modalCategory]?.filter(id => id !== productId) || []
                              : [...(prev[modalCategory] || []), productId]
                          }));
                        }}
                        style={{
                          border: `2px solid ${selectedInventoryProducts[modalCategory]?.includes(product.sku) ? "#ff6b35" : "#ddd"}`,
                          borderRadius: "8px",
                          padding: "15px",
                          cursor: "pointer",
                          backgroundColor: selectedInventoryProducts[modalCategory]?.includes(product.sku) ? "#fff3cd" : "white",
                          transition: "all 0.2s ease",
                          position: "relative"
                        }}
                      >
                        {product.image_data && (
                          <img
                            src={`data:image/jpeg;base64,${product.image_data}`}
                            alt={product.name}
                            style={{
                              width: "100%",
                              height: "120px",
                              objectFit: "cover",
                              borderRadius: "4px",
                              marginBottom: "10px"
                            }}
                          />
                        )}
                        <h4 style={{
                          margin: "0 0 5px 0",
                          fontSize: "14px",
                          color: "#2c3e50"
                        }}>
                          {product.name}
                        </h4>
                        <p style={{
                          margin: "0 0 5px 0",
                          fontSize: "12px",
                          color: "#666"
                        }}>
                          SKU: {product.sku}
                        </p>
                        <p style={{
                          margin: 0,
                          fontSize: "12px",
                          fontWeight: "600",
                          color: "#27ae60"
                        }}>
                          ₱{product.unit_price}
                        </p>
                        {selectedInventoryProducts[modalCategory]?.includes(product.sku) && (
                          <div style={{
                            position: "absolute",
                            top: "10px",
                            right: "10px",
                            backgroundColor: "#ff6b35",
                            color: "white",
                            borderRadius: "50%",
                            width: "20px",
                            height: "20px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "12px"
                          }}>
                            ✓
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div style={{
              marginTop: "30px",
              padding: "20px 0 0 0",
              borderTop: "1px solid #eee",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <p style={{ margin: 0, fontSize: "14px", color: "#666" }}>
                Selected: {Object.values(selectedInventoryProducts).flat().length} products across all categories
              </p>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={clearSelectedInventoryProducts}
                  style={{
                    backgroundColor: "#dc3545",
                    color: "white",
                    border: "none",
                    padding: "12px 24px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "600"
                  }}
                >
                  Clear All
                </button>
                <button
                  onClick={() => setShowProductSelection(false)}
                  style={{
                    backgroundColor: "#ff6b35",
                    color: "white",
                    border: "none",
                    padding: "12px 24px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "600"
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
