export type FieldType = 'text' | 'number' | 'select' | 'textarea' | 'checkbox';

export interface CategoryField {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  options?: string[]; // For select fields
  min?: number; // For number fields
  max?: number;
  unit?: string; // e.g., "km", "cc", "GB"
}

export interface CategorySchema {
  name: string;
  fields: CategoryField[];
}

export const categoryFieldsMap: Record<string, CategorySchema> = {
  'Electronics': {
    name: 'Electronics',
    fields: [
      { key: 'brand', label: 'Brand', type: 'text', required: true, placeholder: 'e.g., Samsung, Apple' },
      { key: 'model', label: 'Model', type: 'text', required: true, placeholder: 'e.g., Galaxy S24' },
      { key: 'condition', label: 'Condition', type: 'select', required: true, options: ['Brand New', 'Like New', 'Good', 'Fair'] },
      { key: 'warranty', label: 'Warranty', type: 'select', required: false, options: ['No Warranty', '3 Months', '6 Months', '1 Year', '2 Years'] },
      { key: 'color', label: 'Color', type: 'text', required: false, placeholder: 'e.g., Black, Silver' },
    ],
  },
  'Automotive': {
    name: 'Automotive',
    fields: [
      { key: 'make', label: 'Make', type: 'text', required: true, placeholder: 'e.g., Toyota, Honda' },
      { key: 'model', label: 'Model', type: 'text', required: true, placeholder: 'e.g., Camry, Civic' },
      { key: 'year', label: 'Year', type: 'number', required: true, min: 1990, max: new Date().getFullYear() + 1 },
      { key: 'engineCapacity', label: 'Engine Capacity', type: 'number', required: false, unit: 'cc', placeholder: 'e.g., 2000' },
      { key: 'mileage', label: 'Mileage', type: 'number', required: false, unit: 'km', placeholder: 'e.g., 50000' },
      { key: 'fuelType', label: 'Fuel Type', type: 'select', required: true, options: ['Petrol', 'Diesel', 'Hybrid', 'Electric'] },
      { key: 'transmission', label: 'Transmission', type: 'select', required: true, options: ['Automatic', 'Manual'] },
      { key: 'condition', label: 'Condition', type: 'select', required: true, options: ['Brand New', 'Foreign Used', 'Locally Used'] },
      { key: 'color', label: 'Exterior Color', type: 'text', required: false, placeholder: 'e.g., Black, White' },
    ],
  },
  'Mobile Phones': {
    name: 'Mobile Phones',
    fields: [
      { key: 'brand', label: 'Brand', type: 'text', required: true, placeholder: 'e.g., Apple, Samsung, Tecno' },
      { key: 'model', label: 'Model', type: 'text', required: true, placeholder: 'e.g., iPhone 15, Galaxy A54' },
      { key: 'storage', label: 'Storage', type: 'select', required: true, options: ['16GB', '32GB', '64GB', '128GB', '256GB', '512GB', '1TB'] },
      { key: 'ram', label: 'RAM', type: 'select', required: false, options: ['2GB', '3GB', '4GB', '6GB', '8GB', '12GB', '16GB'] },
      { key: 'condition', label: 'Condition', type: 'select', required: true, options: ['Brand New', 'Like New', 'Good', 'Fair'] },
      { key: 'color', label: 'Color', type: 'text', required: false, placeholder: 'e.g., Black, Gold' },
      { key: 'networkLock', label: 'Network Lock', type: 'select', required: false, options: ['Unlocked', 'Locked'] },
    ],
  },
  'Fashion & Clothing': {
    name: 'Fashion & Clothing',
    fields: [
      { key: 'brand', label: 'Brand', type: 'text', required: false, placeholder: 'e.g., Nike, Zara' },
      { key: 'size', label: 'Size', type: 'select', required: true, options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'] },
      { key: 'color', label: 'Color', type: 'text', required: true, placeholder: 'e.g., Blue, Red' },
      { key: 'material', label: 'Material', type: 'text', required: false, placeholder: 'e.g., Cotton, Polyester' },
      { key: 'gender', label: 'Gender', type: 'select', required: true, options: ['Men', 'Women', 'Unisex', 'Boys', 'Girls'] },
      { key: 'condition', label: 'Condition', type: 'select', required: true, options: ['Brand New', 'Like New', 'Good'] },
    ],
  },
  'Home & Garden': {
    name: 'Home & Garden',
    fields: [
      { key: 'brand', label: 'Brand', type: 'text', required: false, placeholder: 'e.g., IKEA, Samsung' },
      { key: 'material', label: 'Material', type: 'text', required: false, placeholder: 'e.g., Wood, Metal, Plastic' },
      { key: 'color', label: 'Color', type: 'text', required: false, placeholder: 'e.g., Brown, White' },
      { key: 'condition', label: 'Condition', type: 'select', required: true, options: ['Brand New', 'Like New', 'Good', 'Fair'] },
      { key: 'roomType', label: 'Room Type', type: 'select', required: false, options: ['Living Room', 'Bedroom', 'Kitchen', 'Bathroom', 'Outdoor', 'Office'] },
    ],
  },
  'Health & Beauty': {
    name: 'Health & Beauty',
    fields: [
      { key: 'brand', label: 'Brand', type: 'text', required: true, placeholder: 'e.g., Nivea, Dove' },
      { key: 'skinType', label: 'Skin Type', type: 'select', required: false, options: ['All Skin Types', 'Oily', 'Dry', 'Combination', 'Sensitive'] },
      { key: 'gender', label: 'For', type: 'select', required: false, options: ['Men', 'Women', 'Unisex'] },
      { key: 'expiryDate', label: 'Expiry Date', type: 'text', required: false, placeholder: 'e.g., December 2025' },
      { key: 'organic', label: 'Organic/Natural', type: 'checkbox', required: false },
    ],
  },
  'Sports & Outdoors': {
    name: 'Sports & Outdoors',
    fields: [
      { key: 'brand', label: 'Brand', type: 'text', required: false, placeholder: 'e.g., Nike, Adidas' },
      { key: 'sportType', label: 'Sport Type', type: 'select', required: true, options: ['Football', 'Basketball', 'Tennis', 'Running', 'Gym', 'Swimming', 'Cycling', 'Other'] },
      { key: 'size', label: 'Size', type: 'text', required: false, placeholder: 'e.g., Size 42, Medium' },
      { key: 'color', label: 'Color', type: 'text', required: false, placeholder: 'e.g., Black, Blue' },
      { key: 'condition', label: 'Condition', type: 'select', required: true, options: ['Brand New', 'Like New', 'Good', 'Fair'] },
    ],
  },
  'Books & Media': {
    name: 'Books & Media',
    fields: [
      { key: 'author', label: 'Author/Artist', type: 'text', required: true, placeholder: 'e.g., Chinua Achebe' },
      { key: 'format', label: 'Format', type: 'select', required: true, options: ['Paperback', 'Hardcover', 'E-book', 'Audiobook', 'CD', 'DVD', 'Vinyl'] },
      { key: 'language', label: 'Language', type: 'select', required: true, options: ['English', 'French', 'Twi', 'Hausa', 'Other'] },
      { key: 'condition', label: 'Condition', type: 'select', required: true, options: ['Brand New', 'Like New', 'Good', 'Acceptable'] },
      { key: 'isbn', label: 'ISBN', type: 'text', required: false, placeholder: 'e.g., 978-3-16-148410-0' },
    ],
  },
  'Toys & Games': {
    name: 'Toys & Games',
    fields: [
      { key: 'brand', label: 'Brand', type: 'text', required: false, placeholder: 'e.g., LEGO, Hasbro' },
      { key: 'ageRange', label: 'Age Range', type: 'select', required: true, options: ['0-2 years', '3-5 years', '6-8 years', '9-12 years', '13+ years', 'All Ages'] },
      { key: 'condition', label: 'Condition', type: 'select', required: true, options: ['Brand New', 'Like New', 'Good'] },
      { key: 'batteries', label: 'Batteries Required', type: 'checkbox', required: false },
    ],
  },
  'Food & Beverages': {
    name: 'Food & Beverages',
    fields: [
      { key: 'brand', label: 'Brand', type: 'text', required: false, placeholder: 'e.g., Nestle, Unilever' },
      { key: 'expiryDate', label: 'Expiry Date', type: 'text', required: true, placeholder: 'e.g., December 2025' },
      { key: 'dietaryInfo', label: 'Dietary Info', type: 'select', required: false, options: ['None', 'Vegetarian', 'Vegan', 'Gluten-Free', 'Halal', 'Kosher'] },
      { key: 'organic', label: 'Organic', type: 'checkbox', required: false },
      { key: 'storageType', label: 'Storage', type: 'select', required: false, options: ['Room Temperature', 'Refrigerated', 'Frozen'] },
    ],
  },
  'Jewelry & Accessories': {
    name: 'Jewelry & Accessories',
    fields: [
      { key: 'material', label: 'Material', type: 'select', required: true, options: ['Gold', 'Silver', 'Platinum', 'Stainless Steel', 'Leather', 'Fabric', 'Other'] },
      { key: 'gender', label: 'For', type: 'select', required: true, options: ['Men', 'Women', 'Unisex'] },
      { key: 'condition', label: 'Condition', type: 'select', required: true, options: ['Brand New', 'Like New', 'Good'] },
      { key: 'color', label: 'Color', type: 'text', required: false, placeholder: 'e.g., Gold, Silver' },
    ],
  },
  'Arts & Crafts': {
    name: 'Arts & Crafts',
    fields: [
      { key: 'artType', label: 'Type', type: 'select', required: true, options: ['Painting', 'Sculpture', 'Handmade Craft', 'Print', 'Digital Art', 'Other'] },
      { key: 'medium', label: 'Medium', type: 'text', required: false, placeholder: 'e.g., Oil on Canvas, Wood Carving' },
      { key: 'dimensions', label: 'Dimensions', type: 'text', required: false, placeholder: 'e.g., 50cm x 70cm' },
      { key: 'handmade', label: 'Handmade', type: 'checkbox', required: false },
    ],
  },
  'Other': {
    name: 'Other',
    fields: [
      { key: 'condition', label: 'Condition', type: 'select', required: true, options: ['Brand New', 'Like New', 'Good', 'Fair', 'For Parts'] },
    ],
  },
};

// Get fields for a category
export const getCategoryFields = (category: string): CategoryField[] => {
  return categoryFieldsMap[category]?.fields || categoryFieldsMap['Other'].fields;
};

// Validate category-specific fields
export const validateCategoryFields = (
  category: string,
  values: Record<string, string | boolean>
): Record<string, string> => {
  const fields = getCategoryFields(category);
  const errors: Record<string, string> = {};

  for (const field of fields) {
    const value = values[field.key];

    if (field.required) {
      if (field.type === 'checkbox') {
        // Checkboxes don't need required validation typically
        continue;
      }
      if (!value || (typeof value === 'string' && !value.trim())) {
        errors[field.key] = `${field.label} is required`;
        continue;
      }
    }

    if (value && field.type === 'number') {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        errors[field.key] = `${field.label} must be a number`;
      } else {
        if (field.min !== undefined && numValue < field.min) {
          errors[field.key] = `${field.label} must be at least ${field.min}`;
        }
        if (field.max !== undefined && numValue > field.max) {
          errors[field.key] = `${field.label} must be at most ${field.max}`;
        }
      }
    }
  }

  return errors;
};
