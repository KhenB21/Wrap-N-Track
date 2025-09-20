import React, { useState, useEffect, useRef } from 'react';
import Select from 'react-select';
import api from '../api';
import './SupplierDropdown.css';

const SupplierDropdown = ({ 
  value, 
  onChange, 
  onAddNewSupplier, 
  disabled = false, 
  placeholder = "Select a supplier...",
  error = false 
}) => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Fetch suppliers on component mount
  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/suppliers');
      const suppliersData = response.data.map(supplier => ({
        value: supplier.supplier_id,
        label: supplier.name,
        phone: supplier.telephone || supplier.cellphone,
        website: supplier.website,
        email: supplier.email_address,
        contact_person: supplier.contact_person
      }));
      setSuppliers(suppliersData);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter suppliers based on search term
  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (supplier.contact_person && supplier.contact_person.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Custom option component to show additional details
  const CustomOption = ({ innerProps, data, isSelected, isFocused }) => (
    <div
      {...innerProps}
      className={`supplier-option ${isSelected ? 'selected' : ''} ${isFocused ? 'focused' : ''}`}
    >
      <div className="supplier-option-main">
        <div className="supplier-name">{data.label}</div>
        {data.contact_person && (
          <div className="supplier-contact">{data.contact_person}</div>
        )}
      </div>
      <div className="supplier-option-details">
        {data.phone && <div className="supplier-phone">{data.phone}</div>}
        {data.email && <div className="supplier-email">{data.email}</div>}
      </div>
    </div>
  );

  // Custom no options message
  const NoOptionsMessage = ({ inputValue }) => (
    <div className="no-options-message">
      <div className="no-options-text">
        {inputValue ? `No supplier found for "${inputValue}"` : 'No suppliers available'}
      </div>
      <button
        type="button"
        className="add-supplier-btn"
        onClick={(e) => {
          e.stopPropagation();
          onAddNewSupplier();
        }}
      >
        + Add New Supplier
      </button>
    </div>
  );

  // Custom menu list to add "Add New Supplier" option
  const CustomMenuList = ({ children, ...props }) => (
    <div className="supplier-menu-list">
      {children}
      <div className="add-supplier-option">
        <button
          type="button"
          className="add-supplier-btn"
          onClick={(e) => {
            e.stopPropagation();
            onAddNewSupplier();
          }}
        >
          + Add New Supplier
        </button>
      </div>
    </div>
  );

  const handleInputChange = (newValue) => {
    setSearchTerm(newValue);
    return newValue;
  };

  const handleChange = (selectedOption) => {
    onChange(selectedOption);
  };

  return (
    <div className="supplier-dropdown-container">
      <Select
        value={value}
        onChange={handleChange}
        onInputChange={handleInputChange}
        options={filteredSuppliers}
        components={{
          Option: CustomOption,
          NoOptionsMessage,
          MenuList: CustomMenuList
        }}
        placeholder={placeholder}
        isSearchable
        isClearable
        isLoading={loading}
        isDisabled={disabled}
        classNamePrefix="supplier-select"
        styles={{
          control: (base, state) => ({
            ...base,
            borderColor: error ? '#ef4444' : state.isFocused ? '#4361ee' : '#d1d5db',
            boxShadow: state.isFocused ? '0 0 0 3px rgba(67, 97, 238, 0.1)' : 'none',
            minHeight: 40,
            fontSize: '1rem',
            background: '#fff',
            borderWidth: '1.5px',
            borderRadius: '8px',
          }),
          menu: base => ({
            ...base,
            zIndex: 9999,
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
          }),
          option: (base, state) => ({
            ...base,
            backgroundColor: state.isSelected
              ? '#4361ee'
              : state.isFocused
              ? '#f0f4ff'
              : '#fff',
            color: state.isSelected ? '#fff' : '#374151',
            fontSize: '1rem',
            padding: '12px 16px',
          }),
          placeholder: base => ({
            ...base,
            color: '#9ca3af',
            fontSize: '1rem',
          }),
        }}
      />
    </div>
  );
};

export default SupplierDropdown;
