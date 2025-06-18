import { baseURL } from './config';

export const getInventory = async () => {
  try {
    const response = await fetch(`${baseURL}/api/inventory`);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching inventory:', error);
    throw error;
  }
};

export const deleteInventoryItem = async (sku) => {
  try {
    const response = await api.delete(`/inventory/${sku}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting item with SKU: ${sku}`, error);
    throw error;
  }
};

export const saveInventoryItem = async (itemData) => {
  const formData = new FormData();

  if (itemData.image && itemData.image.uri) {
    const uri = itemData.image.uri;
    const uriParts = uri.split('.');
    const fileType = uriParts[uriParts.length - 1];
    formData.append('image', {
      uri,
      name: `photo.${fileType}`,
      type: `image/${fileType}`,
    });
  }

  for (const key in itemData) {
    if (Object.prototype.hasOwnProperty.call(itemData, key) && key !== 'image') {
      formData.append(key, itemData[key]);
    }
  }

  try {
    const response = await api.post('/inventory', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error saving inventory item:', error.response ? error.response.data : error);
    throw error;
  }
};
