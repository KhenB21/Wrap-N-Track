import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import "./OrderProcess.css";
import TopbarCustomer from '../../Components/TopbarCustomer';
import "./CustomerPOV.css";
import api from '../../api/axios';

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
  const [customProducts, setCustomProducts] = useState({
    packaging: false,
    beverages: false,
    food: false,
    kitchenware: false,
    homeDecor: false,
    faceAndBody: false,
    clothing: false,
    customization: false
  });
  const [customProductDetails, setCustomProductDetails] = useState({
    packaging: { name: 'Own Product', description: 'Packaging', image: null },
    beverages: { name: 'Own Product', description: 'Beverages', image: null },
    food: { name: 'Own Product', description: 'Food', image: null },
    kitchenware: { name: 'Own Product', description: 'Kitchenware', image: null },
    homeDecor: { name: 'Own Product', description: 'Home Decor', image: null },
    faceAndBody: { name: 'Own Product', description: 'Face and Body', image: null },
    clothing: { name: 'Own Product', description: 'Clothing and Accessories', image: null },
    customization: { name: 'Own Product', description: 'Custom Addition', image: null }
  });
  const [selectedStyle, setSelectedStyle] = useState('');
  const [loading, setLoading] = useState(false);

  const modernRomantic = [
    {
      image1: "/Assets/Images/Products/modern-romantic.png",
      image2: "/Assets/Images/Products/modern-romantic-2.png",
      description: "Modern Romantic",
    },
    {
      name: "Signature box",
    },
    {
      name: "Wellsmith Sprinkle",
    },
    {
      name: "Artisanal Chocolate Bar",
    },
    {
      name: "Palapa Seasoning",
    },
  ];

  const bohoChic = [
    {
      image1: "/Assets/Images/Products/boho-chic-1.png",
      image2: "/Assets/Images/Products/boho-chic-2.png",
      description: "Bohemian Chic",
    },
    {
      name: "Personalized Wooden Gift Box",
    },
    {
      name: "Wax-sealed Letter",
    },
    {
      name: "Artisanal Face and Body products (local)",
    },
    {
      name: "Inabal Beach Towel",
    },
    {
      name: "Scented Soy Candle",
    },
  ];

  const classicElegance = [
    {
      image1: "/Assets/Images/Products/classic-elegance-1.png",
      image2: "/Assets/Images/Products/classic-elegance-2.png",
      description: "Classic Elegance",
    },
    {
      name: "Custom-labelled Beer",
    },
    {
      name: "Custom-labelled Mini Wine",
    },
    {
      name: "Wedding Monogram",
    },
    {
      name: "Custom Silk Robe",
    },
    {
      name: "Customized Candle",
    },
    {
      name: "Loose-leaf Tea in Personalized Packaging",
    },
    {
      name: "Crystal Bracelet",
    },
  ];

  const minimalistModern = [
    {
      image1: "/Assets/Images/Products/minimalist-modern-1.png",
      image2: "/Assets/Images/Products/minimalist-modern-2.png",
      description: "Minimalist Modern",
    },
    {
      name: "Custom Wooden Box Engraving",
    },
    {
      name: "Custom Scented Candle",
    },
    {
      name: "Custom Mini Candle",
    },
    {
      name: "Local Coffee & Tea",
    },
    {
      name: "Custom-labelled Mini Wine",
    },
    {
      name: "Custom-labelled Mini Liquor",
    },
    {
      name: "Cigar",
    },
    {
      name: "Inabel Hand Towel",
    },
    {
      name: "Aromatherapy Hand Wash",
    },
    {
      name: "Room & Linen Spray",
    },
    {
      name: "Necktie",
    },
  ];

  const packagingOptions = [
    {
      name: "Blanc Box",
      image: "/Assets/Images/Products/blanc-box.png",
      description: "white mailer",
    },
    {
      name: "Signature Box",
      image: "/Assets/Images/Products/signature-box.png",
      description: "wooden box with acrylic cover",
    },
    {
      name: "Premium Box",
      image: "/Assets/Images/Products/premium-box.png",
      description: "wooden box with wooden cover",
    },
  ];

  const contentBeverageOptions = [
    {
      name: "Local Coffee",
      image: "/Assets/Images/Products/local-coffee.png",
      description: "Local Coffee",
    },
    {
      name: "Loose-leaf Tea",
      image: "/Assets/Images/Products/loose-leaf-tea.png",
      description: "Loose-leaf Tea",
    },
    {
      name: "Beer",
      image: "/Assets/Images/Products/beer.png",
      description: "Beer",
    },
    {
      name: "Mini Wine",
      image: "/Assets/Images/Products/mini-wine.png",
      description: "Mini Wine",
    },
    {
      name: "Mini Whiskey",
      image: "/Assets/Images/Products/mini-whiskey.png",
      description: "Mini Whiskey",
    },
    {
      name: "Full-sized Wine",
      image: "/Assets/Images/Products/full-sized-wine.png",
      description: "Full-sized Wine",
    },
    {
      name: "Full-sized Spirits/Liquor",
      image: "/Assets/Images/Products/full-sized-spirits-liquor.png",
      description: "Full-sized Spirits/Liquor",
    },
    {
      name: "Tablea de Cacao",
      image: "/Assets/Images/Products/tablea-de-cacao.png",
      description: "Tablea de Cacao",
    },
  ];

  const contentFoodOptions = [
    {
      name: "Sweet Pastries & Cookies",
      image: "/Assets/Images/Products/sweet-pastries-and-cookies.png",
      description: "MOQ: 6 pcs., sold as a set",
    },
    {
      name: "French Macarons",
      image: "/Assets/Images/Products/french-macarons.png",
      description: "MOQ: 6 pcs.",
    },
    {
      name: "Artisanal Chocolate bar",
      image: "/Assets/Images/Products/artisanal-chocolate-bar.png",
      description: "",
    },
    {
      name: "Custom Sugar Cookies",
      image: "/Assets/Images/Products/custom-sugar-cookies.png",
      description: "MOQ: 12 pcs. per design",
    },
    {
      name: "Organic Raw Honey",
      image: "/Assets/Images/Products/organic-raw-honey.png",
      description: "",
    },
    {
      name: "Infused Salt",
      image: "/Assets/Images/Products/infused-salt.png",
      description: "set",
    },
    {
      name: "Super Seeds & Nuts",
      image: "/Assets/Images/Products/super-seeds-and-nuts.png",
      description: "",
    },
  ];

  const contentKitchenwareOptions = [
    {
      name: "Cheese Knives",
      image: "/Assets/Images/Products/cheese-knives.png",
      description: "set",
    },
    {
      name: "Champagne Flute",
      image: "/Assets/Images/Products/champagne-flute.png",
      description: "",
    },
    {
      name: "Stemless Wine Glass",
      image: "/Assets/Images/Products/stemless-wine-glass.png",
      description: "customizable",
    },
    {
      name: "Tea Infuser",
      image: "/Assets/Images/Products/tea-infuser.png",
      description: "",
    },
    {
      name: "Whiskey Glass",
      image: "/Assets/Images/Products/whiskey-glass.png",
      description: "",
    },
    {
      name: "Beer Mug",
      image: "/Assets/Images/Products/beer-mug.png",
      description: "set",
    },
    {
      name: "Mug",
      image: "/Assets/Images/Products/mug.png",
      description: "MOQ: 10 pcs., Customizable: Engraving",
    },
    {
      name: "Wooden Coaster",
      image: "/Assets/Images/Products/wooden-coaster.png",
      description: "customizable",
    },
  ];

  const contentHomeDecorOptions = [
    {
      name: "Scented Candle",
      image: "/Assets/Images/Products/scented-candle.png",
      description: "",
    },
    {
      name: "Reed Difuser",
      image: "/Assets/Images/Products/reed-difuser.png",
      description: "",
    },
    {
      name: "Room & Linen Spray",
      image: "/Assets/Images/Products/room-and-linen-Spray.png",
      description: "",
    },
  ];

  const contentFaceAndBodyOptions = [
    {
      name: "Artisanal Soap",
      image: "/Assets/Images/Products/artisanal-soap.png",
      description: "",
    },
    {
      name: "Aromatherapy Hand Wash",
      image: "/Assets/Images/Products/aromatherapy-hand-wash.png",
      description: "",
    },
    {
      name: "Aromatherapy Body Wash",
      image: "/Assets/Images/Products/aromatherapy-body-wash.png",
      description: "",
    },
    {
      name: "Solid Lotion bar",
      image: "/Assets/Images/Products/solid-lotion-bar.png",
      description: "",
    },
    {
      name: "Pomade",
      image: "/Assets/Images/Products/pomade.png",
      description: "",
    },
    {
      name: "Bath Soak",
      image: "/Assets/Images/Products/bath-soak.png",
      description: "",
    },
    {
      name: "Sugar Body Polish",
      image: "/Assets/Images/Products/sugar-body-polish.png",
      description: "",
    },
  ];

  const contentClothingAndAccessoriesOptions = [
    {
      name: "Satin Robe",
      image: "/Assets/Images/Products/satin-robe.png",
      description: "customizable",
    },
    {
      name: "Men's Satin Robe",
      image: "/Assets/Images/Products/mens-satin-robe.png",
      description: "customizble",
    },
    {
      name: "Satin Headband",
      image: "/Assets/Images/Products/satin-headband.png",
      description: "",
    },
    {
      name: "Crystal Stacker",
      image: "/Assets/Images/Products/crystal-stacker.png",
      description: "",
    },
    {
      name: "Custom Clay Earrings",
      image: "/Assets/Images/Products/custom-clay-earrings.png",
      description: "",
    },
  ];

  const customizationOptions = [
    {
      name: "Wax-sealed Letter",
      image: "/Assets/Images/Products/blanc-box.png",
      description: "free with any of our boxes",
    },
    {
      name: "Decal Sticker",
      image: "/Assets/Images/Products/signature-box.png",
      description: "",
    },
    {
      name: "Logo Engraving",
      image: "/Assets/Images/Products/premium-box.png",
      description: "MOQ: 10 pcs.",
    },
    {
      name: "Ribbon Color",
      image: "/Assets/Images/Products/premium-box.png",
      description: "",
    },
  ];

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
        "Full-sized Spirits/Liquor": "BC7247486312457", "Tablea de Cacao": "BC3186447262236",
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

      const styleDataMap = {
        "Modern Romantic": modernRomantic,
        "Bohemian Chic": bohoChic,
        "Classic Elegance": classicElegance,
        "Minimalist Modern": minimalistModern,
      };

      if (formData.style && styleDataMap[formData.style]) {
        const selectedStyleArray = styleDataMap[formData.style];
        if (selectedStyleArray && selectedStyleArray.length > 0) {
          productsForOrder = selectedStyleArray.slice(1).map(styleItem => {
            const sku = productNameToSku[styleItem.name];
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
          console.warn(`Style '${formData.style}' selected but no items found or style data is invalid. Falling back to handpicked items if any.`);
          productsForOrder = getAllSelectedItems().map(item => {
            const sku = productNameToSku[item.name];
            if (!sku) {
              alert(`Product '${item.name}' (handpicked fallback) does not have a matching SKU and will not be included.`);
              return null;
            }
            return { name: item.name, quantity: guestQuantity, sku };
          }).filter(Boolean);
        }
      } else { 
        productsForOrder = getAllSelectedItems().map(item => {
          const sku = productNameToSku[item.name];
          if (!sku) {
            alert(`Product '${item.name}' does not have a matching SKU and will not be included in the order.`);
            return null;
          }
          return {
            name: item.name,
            quantity: guestQuantity,
            sku
          };
        }).filter(Boolean);
      }

      if (!productsForOrder || productsForOrder.length === 0) {
        alert('No products selected or available for the order. Please select items or a valid style.');
        setLoading(false);
        return;
      }

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

      const response = await api.post('/api/orders', orderPayload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.data) {
        toast.success('Order is completed');
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
      const item = packagingOptions.find(opt => opt.name === name);
      if (item) items.push({ ...item, category: 'packaging' });
    });

    selectedBeverages.forEach(name => {
      const item = contentBeverageOptions.find(opt => opt.name === name);
      if (item) items.push({ ...item, category: 'beverages' });
    });

    selectedFood.forEach(name => {
      const item = contentFoodOptions.find(opt => opt.name === name);
      if (item) items.push({ ...item, category: 'food' });
    });

    selectedKitchenware.forEach(name => {
      const item = contentKitchenwareOptions.find(opt => opt.name === name);
      if (item) items.push({ ...item, category: 'kitchenware' });
    });

    selectedHomeDecor.forEach(name => {
      const item = contentHomeDecorOptions.find(opt => opt.name === name);
      if (item) items.push({ ...item, category: 'homedecor' });
    });

    selectedFaceAndBody.forEach(name => {
      const item = contentFaceAndBodyOptions.find(opt => opt.name === name);
      if (item) items.push({ ...item, category: 'faceandbody' });
    });

    selectedClothing.forEach(name => {
      const item = contentClothingAndAccessoriesOptions.find(opt => opt.name === name);
      if (item) items.push({ ...item, category: 'clothing' });
    });

    selectedCustomization.forEach(name => {
      const item = customizationOptions.find(opt => opt.name === name);
      if (item) items.push({ ...item, category: 'customization' });
    });

    return items;
  };

  const renderModal = () => {
    if (!showModal) return null;

    const renderCategoryContent = () => {
      const allItems = [
        ...packagingOptions.map(item => ({ ...item, category: 'packaging' })),
        ...contentBeverageOptions.map(item => ({ ...item, category: 'beverages' })),
        ...contentFoodOptions.map(item => ({ ...item, category: 'food' })),
        ...contentKitchenwareOptions.map(item => ({ ...item, category: 'kitchenware' })),
        ...contentHomeDecorOptions.map(item => ({ ...item, category: 'homedecor' })),
        ...contentFaceAndBodyOptions.map(item => ({ ...item, category: 'faceandbody' })),
        ...contentClothingAndAccessoriesOptions.map(item => ({ ...item, category: 'clothing' })),
        ...customizationOptions.map(item => ({ ...item, category: 'customization' }))
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
    setCustomProducts(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
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
    let items;
    switch(selectedStyle) {
      case 'modern-romantic':
        items = modernRomantic;
        break;
      case 'boho-chic':
        items = bohoChic;
        break;
      case 'classic-elegance':
        items = classicElegance;
        break;
      case 'minimalist-modern':
        items = minimalistModern;
        break;
      default:
        return null;
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
          <img 
            src={items[0].image1} 
            alt={items[0].description}
            style={{ width: "48%", borderRadius: "8px" }}
          />
          <img 
            src={items[0].image2} 
            alt={items[0].description}
            style={{ width: "48%", borderRadius: "8px" }}
          />
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
          {items.slice(1).map((item, index) => (
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

              <div style={{display: "flex", gap: "20px", justifyContent: "center", flexWrap: "wrap"}}>
                {packagingOptions.map((option, index) => (
                  <div 
                    key={index}
                    className="packagingOptions" 
                    style={{
                      border: "2px solid #f0f0f0", 
                      borderRadius: "12px", 
                      padding: "20px", 
                      width: "16%",
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                      position: "relative"
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
          {currentStep === 2 && (
            <form style={{...styles.form, width: "100%"}} onSubmit={handleSubmit}>

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

                  <div style={{display: "flex", gap: "20px", justifyContent: "center", flexWrap: "wrap"}}>
                    {contentBeverageOptions.map((option, index) => (
                      <div 
                        key={index}
                        className="packagingOptions" 
                        style={{
                          border: "2px solid #f0f0f0", 
                          borderRadius: "12px", 
                          padding: "20px", 
                          width: "16%",
                          cursor: "pointer",
                          transition: "all 0.3s ease",
                          position: "relative"
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
                        <div className="packagingImage">
                          <img
                            src={option.image}
                            alt={`${option.name} - ${option.description}`}
                            className={option.name.toLowerCase().replace(" ", "")}
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

                  <div style={{display: "flex", gap: "20px", justifyContent: "center", flexWrap: "wrap"}}>
                    {contentFoodOptions.map((option, index) => (
                      <div 
                        key={index}
                        className="packagingOptions" 
                        style={{
                          border: "2px solid #f0f0f0", 
                          borderRadius: "12px", 
                          padding: "20px", 
                          width: "16%",
                          cursor: "pointer",
                          transition: "all 0.3s ease",
                          position: "relative"
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

                  <div style={{display: "flex", gap: "20px", justifyContent: "center", flexWrap: "wrap"}}>
                    {contentKitchenwareOptions.map((option, index) => (
                      <div 
                        key={index}
                        className="packagingOptions" 
                        style={{
                          border: "2px solid #f0f0f0", 
                          borderRadius: "12px", 
                          padding: "20px", 
                          width: "16%",
                          cursor: "pointer",
                          transition: "all 0.3s ease",
                          position: "relative"
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

                  <div style={{display: "flex", gap: "20px", justifyContent: "center", flexWrap: "wrap"}}>
                    {contentHomeDecorOptions.map((option, index) => (
                      <div 
                        key={index}
                        className="packagingOptions" 
                        style={{
                          border: "2px solid #f0f0f0", 
                          borderRadius: "12px", 
                          padding: "20px", 
                          width: "16%",
                          cursor: "pointer",
                          transition: "all 0.3s ease",
                          position: "relative"
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

                  <div style={{display: "flex", gap: "20px", justifyContent: "center", flexWrap: "wrap"}}>
                    {contentFaceAndBodyOptions.map((option, index) => (
                      <div 
                        key={index}
                        className="packagingOptions" 
                        style={{
                          border: "2px solid #f0f0f0", 
                          borderRadius: "12px", 
                          padding: "20px", 
                          width: "16%",
                          cursor: "pointer",
                          transition: "all 0.3s ease",
                          position: "relative"
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

                  <div style={{display: "flex", gap: "20px", justifyContent: "center", flexWrap: "wrap"}}>
                    {contentClothingAndAccessoriesOptions.map((option, index) => (
                      <div 
                        key={index}
                        className="packagingOptions" 
                        style={{
                          border: "2px solid #f0f0f0", 
                          borderRadius: "12px", 
                          padding: "20px", 
                          width: "16%",
                          cursor: "pointer",
                          transition: "all 0.3s ease",
                          position: "relative"
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

              <div style={{display: "flex", gap: "20px", justifyContent: "center", flexWrap: "wrap"}}>
                {customizationOptions.map((option, index) => (
                  <div 
                    key={index}
                    className="packagingOptions" 
                    style={{
                      border: "2px solid #f0f0f0", 
                      borderRadius: "12px", 
                      padding: "20px", 
                      width: "16%",
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                      position: "relative"
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
        </div>
      </div>
    </div>
  );
}