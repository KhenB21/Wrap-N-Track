const handleAddProduct = async (productData) => {
    try {
      console.log('Sending product data:', productData);
      
      const formData = new FormData();
      Object.keys(productData).forEach(key => {
        if (key === 'image' && productData[key]) {
          formData.append(key, productData[key]);
        } else {
          formData.append(key, productData[key]);
        }
      });

      const response = await fetch('http://localhost:3001/api/inventory', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Server returned non-JSON response:', text);
        throw new Error('Server returned invalid response format');
      }

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to add product');
      }

      if (!data.success) {
        throw new Error(data.message || 'Failed to add product');
      }

      // Refresh the inventory list
      fetchInventory();
      
      // Show success message
      setMessage({
        type: 'success',
        text: 'Product added successfully'
      });
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setMessage(null);
      }, 3000);
      
    } catch (error) {
      console.error('Error adding product:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Failed to add product. Please try again.'
      });
    }
  }; 