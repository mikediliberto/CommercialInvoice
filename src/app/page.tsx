import React, { useState, useEffect } from 'react';
import { AlertCircle, Info, Download, Plus, Trash2, Calculator, Copy, FileText, Printer } from 'lucide-react';

const CustomsInvoiceGenerator = () => {
  const [invoice, setInvoice] = useState({
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    exporter: {
      name: '',
      address: '',
      city: '',
      country: '',
      phone: '',
      email: ''
    },
    importer: {
      name: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      taxId: '',
      phone: '',
      email: ''
    },
    shipment: {
      portOfLoading: '',
      portOfEntry: '',
      countryOfOrigin: '',
      reasonForExport: 'Sale',
      termsOfSale: 'FOB',
      currency: 'USD'
    },
    items: [{
      description: '',
      productCategory: '',
      quantity: '',
      unitOfMeasure: 'PCS',
      unitPrice: '',
      totalValue: '',
      htsCode: '',
      customHtsCode: '',
      countryOfOrigin: '',
      manufacturer: '',
      specialProgram: '',
      ieepaExclusion: '',
      section232Applicable: false,
      section301Applicable: false,
      ieepaApplicable: false,
      notes: ''
    }]
  });

  const [warnings, setWarnings] = useState([]);
  const [totals, setTotals] = useState({ totalValue: 0, totalItems: 0 });
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [generatedInvoiceData, setGeneratedInvoiceData] = useState('');
  const [showPrintableInvoice, setShowPrintableInvoice] = useState(false);
  const [htsData, setHtsData] = useState(null);
  const [apiStatus, setApiStatus] = useState({ loading: false, error: null, lastUpdated: null });

  // Section 232 affected HTS codes (steel and aluminum) - expanded list
  const section232Codes = {
    steel: ['7202', '7203', '7204', '7205', '7206', '7207', '7208', '7209', '7210', '7211', '7212', '7213', '7214', '7215', '7216', '7217', '7218', '7219', '7220', '7221', '7222', '7223', '7224', '7225', '7226', '7227', '7228', '7229', '7301', '7302', '7303', '7304', '7305', '7306', '7307', '7308', '7309', '7310', '7311', '7312', '7313', '7314', '7315', '7316', '7317', '7318', '7319', '7320', '7321', '7322', '7323', '7324', '7325', '7326'],
    aluminum: ['7601', '7602', '7603', '7604', '7605', '7606', '7607', '7608', '7609', '7610', '7611', '7612', '7613', '7614', '7615', '7616']
  };

  // Section 301 affected HTS codes (common categories subject to China tariffs)
  const section301Codes = [
    '8528', '8529', '8530', '8531', '8532', '8533', '8534', '8535', '8536', '8537', '8538', '8539', '8540', '8541', '8542', '8543', // Electronics
    '8544', '8545', '8546', '8547', '8548', // Electrical equipment
    '9403', '9401', '9402', '9404', '9405', '9406', // Furniture
    '3920', '3921', '3922', '3923', '3924', '3925', '3926', // Plastics
    '4911', '4901', '4902', '4903', '4904', '4905', '4906', '4907', '4908', '4909', '4910', // Printed materials
    '7009', '7010', '7011', '7013', '7015', '7016', '7017', '7018', '7019', '7020', // Glass products
    '7408', '7409', '7410', '7411', '7412', '7413', '7415', '7418', '7419', // Copper products
    '8467', '8468', '8201', '8202', '8203', '8204', '8205', '8206', '8207', '8208', '8209', '8210', '8211', '8212', '8213', '8214', '8215', // Tools
    '6401', '6402', '6403', '6404', '6405', // Footwear
    '4202', '4203', // Bags and cases
    '9503', '9504', '9505', // Toys and games
    '9013', '9014', '9015', '9016', '9017', '9018', '9019', '9020', '9021', '9022', '9023', '9024', '9025', '9026', '9027', '9028', '9029', '9030', '9031', '9032', '9033' // Optical/precision instruments
  ];

  // USITC API Integration
  const fetchHtsData = async () => {
    setApiStatus({ loading: true, error: null, lastUpdated: null });
    
    try {
      // Use the most current HTS data from USITC (2025 Revision 13)
      const response = await fetch('https://catalog.data.gov/dataset/harmonized-tariff-schedule-of-the-united-states-2024/resource/3b295bc2-9765-4080-81e4-3645d49a8acd/download/hts2025revision13.json');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setHtsData(data);
      setApiStatus({ 
        loading: false, 
        error: null, 
        lastUpdated: new Date().toISOString() 
      });
      
    } catch (error) {
      console.error('Error fetching HTS data:', error);
      setApiStatus({ 
        loading: false, 
        error: error.message, 
        lastUpdated: null 
      });
    }
  };

  // Load HTS data on component mount
  useEffect(() => {
    fetchHtsData();
  }, []);

  // Enhanced auto-detect function using USITC data
  const autoDetectTariffsFromApi = (htsCode, countryOfOrigin) => {
    const detection = {
      section232: false,
      section301: false,
      ieepa: false,
      tariffRate: null,
      additionalDuties: []
    };
    
    // IEEPA detection (always works without API)
    if (ieepaCountries[countryOfOrigin]) {
      detection.ieepa = true;
    }
    
    // If we have HTS API data, use it for more accurate detection
    if (htsData && htsData.data && Array.isArray(htsData.data)) {
      const htsEntry = htsData.data.find(entry => 
        entry.hts_number === htsCode || 
        entry.hts_number?.startsWith(htsCode.substring(0, 8)) ||
        entry.hts_number?.startsWith(htsCode.substring(0, 6))
      );
      
      if (htsEntry) {
        // Extract base tariff rate
        detection.tariffRate = htsEntry.general_rate || htsEntry.col1_rate || 'Free';
        
        // Check for Section 232 indicators in the data
        const description = (htsEntry.description || '').toLowerCase();
        if (description.includes('steel') || description.includes('iron') || description.includes('aluminum')) {
          const htsFirst4 = htsCode.substring(0, 4);
          if (section232Codes.steel.includes(htsFirst4) || section232Codes.aluminum.includes(htsFirst4)) {
            detection.section232 = true;
          }
        }
        
        // Check for Section 301 indicators
        if (['China', 'CN', 'Hong Kong', 'HK', 'Macau', 'MO'].includes(countryOfOrigin)) {
          // Look for additional duties in the HTS data
          const additionalDuties = htsEntry.additional_duties || [];
          const hasSection301 = additionalDuties.some(duty => 
            duty.includes('9903.88') || duty.includes('301') || duty.includes('china')
          );
          if (hasSection301) {
            detection.section301 = true;
          }
        }
      }
    }
    
    // Fallback to hardcoded logic if API data is not available
    if (!htsData) {
      const htsFirst4 = htsCode.substring(0, 4);
      
      // Section 232 fallback
      if (section232Codes.steel.includes(htsFirst4) || section232Codes.aluminum.includes(htsFirst4)) {
        detection.section232 = true;
      }
      
      // Section 301 fallback
      if (['China', 'CN', 'Hong Kong', 'HK', 'Macau', 'MO'].includes(countryOfOrigin)) {
        if (section301Codes.includes(htsFirst4)) {
          detection.section301 = true;
        }
      }
    }
    
    return detection;
  };

  // IEEPA tariff affected countries and rates (as of July 2025)
  const ieepaCountries = {
    'China': { rate: 10, description: 'Reciprocal tariffs (baseline 30% total with existing tariffs)' },
    'CN': { rate: 10, description: 'Reciprocal tariffs (baseline 30% total with existing tariffs)' },
    'Hong Kong': { rate: 10, description: 'Reciprocal tariffs (same as China)' },
    'HK': { rate: 10, description: 'Reciprocal tariffs (same as China)' },
    'Macau': { rate: 10, description: 'Reciprocal tariffs (same as China)' },
    'MO': { rate: 10, description: 'Reciprocal tariffs (same as China)' },
    'Canada': { rate: 25, description: 'IEEPA tariffs (10% on energy resources)' },
    'CA': { rate: 25, description: 'IEEPA tariffs (10% on energy resources)' },
    'Mexico': { rate: 25, description: 'IEEPA tariffs' },
    'MX': { rate: 25, description: 'IEEPA tariffs' }
  };

  // Special IEEPA exclusion categories for China
  const chinaExclusions = {
    '9903.01.28': 'General exclusion category',
    '9903.01.30': 'Specific product exclusion',
    '9903.01.31': 'Specific product exclusion',
    '9903.01.32': 'Specific product exclusion',
    '9903.01.33': 'Specific product exclusion'
  };

  // Section 232 specific HTS codes for metal components
  const section232SpecificCodes = {
    'Steel Wire': '7217.10.1000',
    'Steel Bars': '7214.20.0000',
    'Steel Sheets': '7209.18.2500',
    'Steel Tubes': '7306.30.5000',
    'Steel Fasteners': '7318.15.2020',
    'Aluminum Wire': '7605.11.0000',
    'Aluminum Bars': '7604.21.0000',
    'Aluminum Sheets': '7606.12.3060',
    'Aluminum Tubes': '7608.20.0030',
    'Other Steel Components': '7326.90.8688',
    'Other Aluminum Components': '7616.99.5190'
  };

  // Additional tariff codes for special programs
  const additionalTariffCodes = {
    section232Steel: '9903.80.01',
    section232Aluminum: '9903.85.01', 
    section232SteelDerivatives: '9903.80.02',
    section232AluminumDerivatives: '9903.85.02',
    section301List1: '9903.88.01',
    section301List2: '9903.88.02', 
    section301List3: '9903.88.03',
    section301List4A: '9903.88.04',
    section301List4B: '9903.88.05',
    ieepaChina: '9903.01.25',
    ieepaCanada: '9903.02.01',
    ieepaMexico: '9903.03.01'
  };

  // Function to determine specific additional tariff codes
  const getAdditionalTariffCodes = (item) => {
    const codes = {};
    
    if (item.section232Applicable) {
      const htsFirst4 = (item.productCategory === 'CUSTOM' ? item.customHtsCode : item.htsCode).substring(0, 4);
      if (section232Codes.steel.includes(htsFirst4)) {
        codes.section232 = additionalTariffCodes.section232Steel;
      } else if (section232Codes.aluminum.includes(htsFirst4)) {
        codes.section232 = additionalTariffCodes.section232Aluminum;
      }
    }
    
    if (item.section301Applicable && ['China', 'CN', 'Hong Kong', 'HK', 'Macau', 'MO'].includes(item.countryOfOrigin)) {
      // Default to List 4A for most products, could be enhanced based on specific HTS ranges
      codes.section301 = additionalTariffCodes.section301List4A;
    }
    
    if (item.ieepaApplicable) {
      if (['China', 'CN', 'Hong Kong', 'HK', 'Macau', 'MO'].includes(item.countryOfOrigin)) {
        codes.ieepa = additionalTariffCodes.ieepaChina;
      } else if (['Canada', 'CA'].includes(item.countryOfOrigin)) {
        codes.ieepa = additionalTariffCodes.ieepaCanada;
      } else if (['Mexico', 'MX'].includes(item.countryOfOrigin)) {
        codes.ieepa = additionalTariffCodes.ieepaMexico;
      }
    }
    
    return codes;
  };

  // Common HTS codes with descriptions (customized for your specific products)
  const commonHtsCodes = {
    'Furniture - Other Furniture Parts (Wood/Metal)': '9403.99.90.45',
    'Furniture - Wooden Seats (Upholstered)': '9403.91.00.80',
    'Electronics - Monitors/Display Units (LCD/LED)': '8528.52.00.00',
    'Plastics - Polyethylene Film/Sheeting': '3920.20.00.55',
    'Printed Materials - Trade Advertising Material': '4911.10.00.80',
    'Glass - Safety Glass Sheets/Plates': '7009.92.50.95',
    'Electrical - Insulated Wire/Cable (Other)': '8544.42.9090',
    'Copper - Wire/Cable (Not Insulated)': '7408.19.00.30',
    'Electrical - Electrical Apparatus Parts': '8536.90.40.00',
    'Plastics - Polyethylene Terephthalate Sheets': '3920.62.0090',
    'Furniture - Metal Tables/Desks': '9403.20.00.90',
    'Furniture - Wooden Furniture (Kitchen/Bedroom)': '9403.60.80.93',
    'Electronics - Sound/Visual Alarm Systems': '8531.10.00.45',
    'Custom/Other - Enter Manual HTS Code': 'CUSTOM'
  };

  // Calculate totals
  useEffect(() => {
    const totalValue = invoice.items.reduce((sum, item) => {
      const value = parseFloat(item.totalValue) || 0;
      return sum + value;
    }, 0);
    
    const totalItems = invoice.items.length;
    
    setTotals({ totalValue, totalItems });
  }, [invoice.items]);

  // Check for warnings
  useEffect(() => {
    const newWarnings = [];
    
    invoice.items.forEach((item, index) => {
      // Check Section 232 applicability
      const effectiveHtsCode = item.productCategory === 'CUSTOM' ? item.customHtsCode : item.htsCode;
      const htsFirst4 = effectiveHtsCode.substring(0, 4);
      const isSteel = section232Codes.steel.includes(htsFirst4);
      const isAluminum = section232Codes.aluminum.includes(htsFirst4);
      
      // Only warn about Section 232 if not properly configured
      if ((isSteel || isAluminum) && !item.section232Applicable) {
        newWarnings.push(`Item ${index + 1}: HTS code ${effectiveHtsCode} may be subject to Section 232 tariffs`);
      }
      
      // Check Section 301 applicability
      if (['China', 'CN', 'Hong Kong', 'HK', 'Macau', 'MO'].includes(item.countryOfOrigin) && !item.section301Applicable) {
        const effectiveHtsCodeCheck = item.productCategory === 'CUSTOM' ? item.customHtsCode : item.htsCode;
        const htsFirst4 = effectiveHtsCodeCheck.substring(0, 4);
        if (section301Codes.includes(htsFirst4)) {
          newWarnings.push(`Item ${index + 1}: Products from ${item.countryOfOrigin} with HTS ${effectiveHtsCodeCheck} may be subject to Section 301 tariffs`);
        }
      }
      
      // Check IEEPA applicability
      if (ieepaCountries[item.countryOfOrigin]) {
        if (!item.ieepaApplicable) {
          const ieepaInfo = ieepaCountries[item.countryOfOrigin];
          newWarnings.push(`Item ${index + 1}: Products from ${item.countryOfOrigin} are subject to IEEPA tariffs (${ieepaInfo.rate}% - ${ieepaInfo.description})`);
        }
        
        // Special warning for China exclusions
        if (['China', 'CN', 'Hong Kong', 'HK', 'Macau', 'MO'].includes(item.countryOfOrigin) && !item.ieepaExclusion) {
          newWarnings.push(`Item ${index + 1}: Consider IEEPA exclusion categories (9903.01.28, 9903.01.30-33) for Chinese goods`);
        }
      }
      
      // Check for missing critical information
      const effectiveHtsCodeCheck = item.productCategory === 'CUSTOM' ? item.customHtsCode : item.htsCode;
      if (!effectiveHtsCodeCheck) {
        newWarnings.push(`Item ${index + 1}: HTS code is required`);
      }
      if (!item.countryOfOrigin) {
        newWarnings.push(`Item ${index + 1}: Country of origin is required`);
      }
      if (!item.manufacturer) {
        newWarnings.push(`Item ${index + 1}: Manufacturer information is required`);
      }
    });
    
    setWarnings(newWarnings);
  }, [invoice.items]);

  const addItem = () => {
    setInvoice(prev => ({
      ...prev,
      items: [...prev.items, {
        description: '',
        productCategory: '',
        quantity: '',
        unitOfMeasure: 'PCS',
        unitPrice: '',
        totalValue: '',
        htsCode: '',
        customHtsCode: '',
        countryOfOrigin: '',
        manufacturer: '',
        specialProgram: '',
        ieepaExclusion: '',
        section232Applicable: false,
        section232MetalValue: '',
        section232HtsCode: '',
        section301Applicable: false,
        ieepaApplicable: false,
        notes: ''
      }]
    }));
  };

  const removeItem = (index) => {
    setInvoice(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index, field, value) => {
    setInvoice(prev => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i === index) {
          const updatedItem = { ...item, [field]: value };
          
          // Handle product category selection
          if (field === 'productCategory') {
            if (value === 'CUSTOM') {
              updatedItem.htsCode = '';
              updatedItem.customHtsCode = '';
            } else {
              updatedItem.htsCode = commonHtsCodes[value] || '';
              updatedItem.customHtsCode = '';
              
              // Auto-detect tariffs when HTS code is set
              if (updatedItem.htsCode && updatedItem.countryOfOrigin) {
                const detection = autoDetectTariffsFromApi(updatedItem.htsCode, updatedItem.countryOfOrigin);
                updatedItem.section232Applicable = detection.section232;
                updatedItem.section301Applicable = detection.section301;
                updatedItem.ieepaApplicable = detection.ieepa;
              }
            }
          }
          
          // Handle custom HTS code changes
          if (field === 'customHtsCode' && value.length >= 4) {
            if (updatedItem.countryOfOrigin) {
              const detection = autoDetectTariffsFromApi(value, updatedItem.countryOfOrigin);
              updatedItem.section232Applicable = detection.section232;
              updatedItem.section301Applicable = detection.section301;
              updatedItem.ieepaApplicable = detection.ieepa;
            }
          }
          
          // Handle country of origin changes
          if (field === 'countryOfOrigin') {
            const effectiveHtsCode = updatedItem.productCategory === 'CUSTOM' ? updatedItem.customHtsCode : updatedItem.htsCode;
            if (effectiveHtsCode && effectiveHtsCode.length >= 4) {
              const detection = autoDetectTariffsFromApi(effectiveHtsCode, value);
              updatedItem.section232Applicable = detection.section232;
              updatedItem.section301Applicable = detection.section301;
              updatedItem.ieepaApplicable = detection.ieepa;
            } else {
              // Just check IEEPA based on country
              updatedItem.ieepaApplicable = !!ieepaCountries[value];
            }
          }
          
          // Auto-calculate total value
          if (field === 'quantity' || field === 'unitPrice') {
            const quantity = parseFloat(field === 'quantity' ? value : item.quantity) || 0;
            const unitPrice = parseFloat(field === 'unitPrice' ? value : item.unitPrice) || 0;
            updatedItem.totalValue = (quantity * unitPrice).toFixed(2);
          }
          
          return updatedItem;
        }
        return item;
      })
    }));
  };

  const updateInvoiceField = (section, field, value) => {
    setInvoice(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const generateInvoice = () => {
    const invoiceData = {
      ...invoice,
      generatedAt: new Date().toISOString(),
      totals,
      warnings
    };
    
    // Create formatted invoice text
    const formattedInvoice = `
COMMERCIAL INVOICE
==================

Invoice Number: ${invoice.invoiceNumber || 'N/A'}
Invoice Date: ${invoice.invoiceDate}
Generated: ${new Date().toLocaleString()}

EXPORTER INFORMATION
--------------------
Company: ${invoice.exporter.name || 'N/A'}
Address: ${invoice.exporter.address || 'N/A'}
City: ${invoice.exporter.city || 'N/A'}
Country: ${invoice.exporter.country || 'N/A'}

IMPORTER INFORMATION
--------------------
Company: ${invoice.importer.name || 'N/A'}
Tax ID: ${invoice.importer.taxId || 'N/A'}
Address: ${invoice.importer.address || 'N/A'}
City: ${invoice.importer.city || 'N/A'}
State: ${invoice.importer.state || 'N/A'}
ZIP: ${invoice.importer.zip || 'N/A'}

SHIPMENT INFORMATION
--------------------
Port of Loading: ${invoice.shipment.portOfLoading || 'N/A'}
Port of Entry: ${invoice.shipment.portOfEntry || 'N/A'}
Terms of Sale: ${invoice.shipment.termsOfSale}

INVOICE ITEMS
=============
${invoice.items.map((item, index) => {
  const effectiveHtsCode = item.productCategory === 'CUSTOM' ? item.customHtsCode : item.htsCode;
  return `
Item ${index + 1}:
  Category: ${item.productCategory || 'N/A'}
  Description: ${item.description || 'N/A'}
  HTS Code: ${effectiveHtsCode || 'N/A'}
  Country of Origin: ${item.countryOfOrigin || 'N/A'}
  Manufacturer: ${item.manufacturer || 'N/A'}
  Quantity: ${item.quantity || 'N/A'}
  Unit Price: ${item.unitPrice || '0.00'}
  Total Value: ${item.totalValue || '0.00'}
  Section 232: ${item.section232Applicable ? 'Yes' : 'No'}
  Section 301: ${item.section301Applicable ? 'Yes' : 'No'}
  IEEPA: ${item.ieepaApplicable ? 'Yes' : 'No'}
  IEEPA Exclusion: ${item.ieepaExclusion || 'None'}
  Notes: ${item.notes || 'None'}
`;
}).join('')}

TOTALS
======
Total Items: ${totals.totalItems}
Total Value: ${totals.totalValue.toFixed(2)} USD

COMPLIANCE WARNINGS
==================
${warnings.length > 0 ? warnings.map(w => `- ${w}`).join('\n') : 'No warnings'}

---
Generated by US Customs Commercial Invoice Generator
`;

    setGeneratedInvoiceData(formattedInvoice);
    setShowInvoicePreview(true);
  };

  const downloadInvoice = () => {
    const blob = new Blob([generatedInvoiceData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customs-invoice-${invoice.invoiceNumber || 'draft'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedInvoiceData);
      alert('Invoice copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy: ', err);
      alert('Copy failed. Please select and copy the text manually.');
    }
  };

  const openPrintableInvoice = () => {
    setShowPrintableInvoice(true);
  };

  const printInvoice = () => {
    window.print();
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">US Customs Commercial Invoice Generator</h1>
        <p className="text-gray-600">Generate compliant commercial invoices with Section 232, Section 301, and IEEPA tariff validation</p>
        
        {/* API Status Indicator */}
        <div className="mt-2 flex items-center gap-2 text-sm">
          {apiStatus.loading && (
            <div className="flex items-center text-blue-600">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
              Loading current HTS data...
            </div>
          )}
          {apiStatus.error && (
            <div className="text-red-600">
              ⚠️ Using offline tariff data (API error: {apiStatus.error})
            </div>
          )}
          {apiStatus.lastUpdated && (
            <div className="text-green-600">
              ✅ Using current USITC data (Updated: {new Date(apiStatus.lastUpdated).toLocaleString()})
            </div>
          )}
          {apiStatus.lastUpdated && (
            <button 
              onClick={fetchHtsData}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Refresh Data
            </button>
          )}
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center mb-2">
            <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
            <h3 className="text-lg font-semibold text-yellow-800">Compliance Warnings</h3>
          </div>
          <ul className="list-disc list-inside text-yellow-700">
            {warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Invoice Header */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
          <input
            type="text"
            value={invoice.invoiceNumber}
            onChange={(e) => setInvoice(prev => ({ ...prev, invoiceNumber: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="INV-2025-001"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date</label>
          <input
            type="date"
            value={invoice.invoiceDate}
            onChange={(e) => setInvoice(prev => ({ ...prev, invoiceDate: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Exporter Information */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-3">Exporter Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Company Name"
            value={invoice.exporter.name}
            onChange={(e) => updateInvoiceField('exporter', 'name', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Address"
            value={invoice.exporter.address}
            onChange={(e) => updateInvoiceField('exporter', 'address', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="City"
            value={invoice.exporter.city}
            onChange={(e) => updateInvoiceField('exporter', 'city', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Country"
            value={invoice.exporter.country}
            onChange={(e) => updateInvoiceField('exporter', 'country', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Importer Information */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-3">Importer Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Company Name"
            value={invoice.importer.name}
            onChange={(e) => updateInvoiceField('importer', 'name', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Tax ID / EIN"
            value={invoice.importer.taxId}
            onChange={(e) => updateInvoiceField('importer', 'taxId', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Address"
            value={invoice.importer.address}
            onChange={(e) => updateInvoiceField('importer', 'address', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="City"
            value={invoice.importer.city}
            onChange={(e) => updateInvoiceField('importer', 'city', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="State"
            value={invoice.importer.state}
            onChange={(e) => updateInvoiceField('importer', 'state', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="ZIP Code"
            value={invoice.importer.zip}
            onChange={(e) => updateInvoiceField('importer', 'zip', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Shipment Information */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-3">Shipment Information</h2>
        <div className="grid grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Port of Loading"
            value={invoice.shipment.portOfLoading}
            onChange={(e) => updateInvoiceField('shipment', 'portOfLoading', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Port of Entry"
            value={invoice.shipment.portOfEntry}
            onChange={(e) => updateInvoiceField('shipment', 'portOfEntry', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={invoice.shipment.termsOfSale}
            onChange={(e) => updateInvoiceField('shipment', 'termsOfSale', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="FOB">FOB</option>
            <option value="CIF">CIF</option>
            <option value="CFR">CFR</option>
            <option value="EXW">EXW</option>
            <option value="DDP">DDP</option>
          </select>
        </div>
      </div>

      {/* Items */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Invoice Items</h2>
          <button
            onClick={addItem}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </button>
        </div>

        {invoice.items.map((item, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-medium text-gray-800">Item {index + 1}</h3>
              <button
                onClick={() => removeItem(index)}
                className="text-red-600 hover:text-red-800"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Category</label>
                <select
                  value={item.productCategory}
                  onChange={(e) => updateItem(index, 'productCategory', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Product Category</option>
                  {Object.keys(commonHtsCodes).map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                {item.productCategory && item.productCategory !== 'CUSTOM' && (
                  <div className="mt-1 text-sm text-gray-600">
                    HTS Code: {commonHtsCodes[item.productCategory]}
                  </div>
                )}
              </div>
              
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Description</label>
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) => updateItem(index, 'description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Detailed product description for customs"
                />
              </div>
              
              {item.productCategory === 'CUSTOM' && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Custom HTS Code (10-digit)</label>
                  <input
                    type="text"
                    value={item.customHtsCode}
                    onChange={(e) => updateItem(index, 'customHtsCode', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="1234567890"
                    maxLength="10"
                  />
                  <div className="mt-1 text-xs text-gray-600">
                    Enter the 10-digit HTS code for your custom product
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country of Origin</label>
                <input
                  type="text"
                  value={item.countryOfOrigin}
                  onChange={(e) => updateItem(index, 'countryOfOrigin', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="China"
                />
                {ieepaCountries[item.countryOfOrigin] && (
                  <div className="mt-1 text-xs text-red-600">
                    ⚠️ IEEPA: {ieepaCountries[item.countryOfOrigin].description}
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="100"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={item.unitPrice}
                  onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="10.50"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Value (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={item.totalValue}
                  onChange={(e) => updateItem(index, 'totalValue', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="1050.00"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
                <input
                  type="text"
                  value={item.manufacturer}
                  onChange={(e) => updateItem(index, 'manufacturer', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ABC Manufacturing Co."
                />
              </div>
            </div>

            {/* IEEPA Exclusion for China */}
            {['China', 'CN', 'Hong Kong', 'HK', 'Macau', 'MO'].includes(item.countryOfOrigin) && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">IEEPA Exclusion Category (Optional)</label>
                <select
                  value={item.ieepaExclusion}
                  onChange={(e) => updateItem(index, 'ieepaExclusion', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No exclusion claimed</option>
                  {Object.entries(chinaExclusions).map(([code, description]) => (
                    <option key={code} value={code}>{code} - {description}</option>
                  ))}
                </select>
                <div className="mt-1 text-xs text-gray-600">
                  Select if this product qualifies for IEEPA exclusion to avoid the 10% reciprocal tariff
                </div>
              </div>
            )}

            <div className="flex items-center space-x-6 mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={item.section232Applicable}
                  onChange={(e) => updateItem(index, 'section232Applicable', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Subject to Section 232</span>
                <span className="ml-1 text-xs text-gray-500">(Auto-detected)</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={item.section301Applicable}
                  onChange={(e) => updateItem(index, 'section301Applicable', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Subject to Section 301</span>
                <span className="ml-1 text-xs text-gray-500">(Auto-detected)</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={item.ieepaApplicable}
                  onChange={(e) => updateItem(index, 'ieepaApplicable', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Subject to IEEPA</span>
                <span className="ml-1 text-xs text-gray-500">(Auto-detected)</span>
              </label>
            </div>

            {/* Section 232 Metal Component Details */}
            {item.section232Applicable && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <h4 className="text-md font-semibold text-yellow-800 mb-3">Section 232 Metal Component Details</h4>
                <p className="text-sm text-yellow-700 mb-3">
                  <strong>Important:</strong> This item will be split into two line items on the commercial invoice:
                  <br />1. Non-metal components value: ${((parseFloat(item.totalValue) || 0) - (parseFloat(item.section232MetalValue) || 0)).toFixed(2)}
                  <br />2. Metal components value: ${item.section232MetalValue || '0.00'} (Subject to Section 232 tariffs)
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Metal Component Value (USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={item.section232MetalValue}
                      onChange={(e) => updateItem(index, 'section232MetalValue', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="250.00"
                    />
                    <div className="mt-1 text-xs text-gray-600">
                      Value of steel/aluminum components only
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Section 232 HTS Code</label>
                    <select
                      value={item.section232HtsCode}
                      onChange={(e) => updateItem(index, 'section232HtsCode', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Metal Component Type</option>
                      {Object.entries(section232SpecificCodes).map(([description, code]) => (
                        <option key={code} value={code}>{description} - {code}</option>
                      ))}
                    </select>
                    <div className="mt-1 text-xs text-gray-600">
                      HTS code specific to the metal components
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
              <textarea
                value={item.notes}
                onChange={(e) => updateItem(index, 'notes', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="2"
                placeholder="Additional compliance notes or special requirements"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Printable Invoice View */}
      {showPrintableInvoice && (
        <div className="fixed inset-0 bg-white z-50 overflow-auto print:relative print:inset-auto print:bg-transparent">
          <div className="max-w-4xl mx-auto p-8 print:p-0">
            {/* Print Controls - Hidden when printing */}
            <div className="mb-6 flex gap-4 print:hidden">
              <button
                onClick={printInvoice}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print / Save as PDF
              </button>
              <button
                onClick={() => setShowPrintableInvoice(false)}
                className="flex items-center px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Close
              </button>
            </div>

            {/* Invoice Content */}
            <div className="bg-white border border-gray-300 print:border-none">
              {/* Header */}
              <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
                <h1 className="text-2xl font-bold mb-2">COMMERCIAL INVOICE</h1>
                <div className="text-sm text-gray-600">
                  Invoice No: {invoice.invoiceNumber || 'N/A'} | Date: {invoice.invoiceDate} | Generated: {new Date().toLocaleDateString()}
                </div>
              </div>

              {/* Company Information */}
              <div className="grid grid-cols-2 gap-8 mb-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2 border-b border-gray-400">EXPORTER</h3>
                  <div className="text-sm">
                    <div className="font-medium">{invoice.exporter.name || 'N/A'}</div>
                    <div>{invoice.exporter.address || 'N/A'}</div>
                    <div>{invoice.exporter.city || 'N/A'}, {invoice.exporter.country || 'N/A'}</div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2 border-b border-gray-400">IMPORTER</h3>
                  <div className="text-sm">
                    <div className="font-medium">{invoice.importer.name || 'N/A'}</div>
                    {invoice.importer.taxId && <div className="text-gray-600">Tax ID: {invoice.importer.taxId}</div>}
                    <div>{invoice.importer.address || 'N/A'}</div>
                    <div>{invoice.importer.city || 'N/A'}, {invoice.importer.state || 'N/A'} {invoice.importer.zip || ''}</div>
                  </div>
                </div>
              </div>

              {/* Shipment Information */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2 border-b border-gray-400">SHIPMENT DETAILS</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div><strong>Port of Loading:</strong> {invoice.shipment.portOfLoading || 'N/A'}</div>
                  <div><strong>Port of Entry:</strong> {invoice.shipment.portOfEntry || 'N/A'}</div>
                  <div><strong>Terms:</strong> {invoice.shipment.termsOfSale}</div>
                </div>
              </div>

              {/* Items Table */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2 border-b border-gray-400">ITEMS</h3>
                <table className="w-full text-xs border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 p-2 text-left">Description</th>
                      <th className="border border-gray-300 p-2 text-left">HTS Code</th>
                      <th className="border border-gray-300 p-2 text-left">Additional Tariff Codes</th>
                      <th className="border border-gray-300 p-2 text-left">Origin</th>
                      <th className="border border-gray-300 p-2 text-center">Qty</th>
                      <th className="border border-gray-300 p-2 text-right">Unit Price</th>
                      <th className="border border-gray-300 p-2 text-right">Total</th>
                      <th className="border border-gray-300 p-2 text-center">Tariffs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item, index) => {
                      const effectiveHtsCode = item.productCategory === 'CUSTOM' ? item.customHtsCode : item.htsCode;
                      const totalValue = parseFloat(item.totalValue) || 0;
                      const metalValue = parseFloat(item.section232MetalValue) || 0;
                      const nonMetalValue = totalValue - metalValue;
                      
                      const rows = [];
                      
                      if (item.section232Applicable && metalValue > 0) {
                        // First row: Non-metal components
                        const tariffs1 = [];
                        if (item.section301Applicable) tariffs1.push('301');
                        if (item.ieepaApplicable) tariffs1.push('IEEPA');
                        
                        const nonMetalCodes = getAdditionalTariffCodes({...item, section232Applicable: false});
                        const additionalCodes1 = [];
                        if (nonMetalCodes.section301) additionalCodes1.push(`301: ${nonMetalCodes.section301}`);
                        if (nonMetalCodes.ieepa) additionalCodes1.push(`IEEPA: ${nonMetalCodes.ieepa}`);
                        
                        rows.push(
                          <tr key={`${index}A`}>
                            <td className="border border-gray-300 p-2">
                              <div className="font-medium">{item.description || 'N/A'} (Non-metal)</div>
                              <div className="text-gray-600">{item.productCategory}</div>
                              {item.manufacturer && <div className="text-gray-500">Mfg: {item.manufacturer}</div>}
                            </td>
                            <td className="border border-gray-300 p-2 font-mono">{effectiveHtsCode || 'N/A'}</td>
                            <td className="border border-gray-300 p-2 font-mono text-xs">
                              {additionalCodes1.length > 0 ? additionalCodes1.map((code, i) => (
                                <div key={i} className="text-blue-600">{code}</div>
                              )) : 'None'}
                            </td>
                            <td className="border border-gray-300 p-2">{item.countryOfOrigin || 'N/A'}</td>
                            <td className="border border-gray-300 p-2 text-center">{item.quantity || 'N/A'}</td>
                            <td className="border border-gray-300 p-2 text-right">Allocated</td>
                            <td className="border border-gray-300 p-2 text-right font-medium">${nonMetalValue.toFixed(2)}</td>
                            <td className="border border-gray-300 p-2 text-center text-xs">
                              {tariffs1.join(', ') || 'None'}
                              {item.ieepaExclusion && <div className="text-red-600">Excl: {item.ieepaExclusion}</div>}
                            </td>
                          </tr>
                        );
                        
                        // Second row: Metal components
                        const tariffs2 = ['232'];
                        if (item.section301Applicable) tariffs2.push('301');
                        if (item.ieepaApplicable) tariffs2.push('IEEPA');
                        
                        const metalCodes = getAdditionalTariffCodes(item);
                        const additionalCodes2 = [];
                        if (metalCodes.section232) additionalCodes2.push(`232: ${metalCodes.section232}`);
                        if (metalCodes.section301) additionalCodes2.push(`301: ${metalCodes.section301}`);
                        if (metalCodes.ieepa) additionalCodes2.push(`IEEPA: ${metalCodes.ieepa}`);
                        
                        rows.push(
                          <tr key={`${index}B`} className="bg-yellow-50">
                            <td className="border border-gray-300 p-2">
                              <div className="font-medium">Metal components of {item.description || 'N/A'}</div>
                              <div className="text-gray-600">Steel/Aluminum Components</div>
                              {item.manufacturer && <div className="text-gray-500">Mfg: {item.manufacturer}</div>}
                            </td>
                            <td className="border border-gray-300 p-2 font-mono">
                              <div>{effectiveHtsCode || 'N/A'}</div>
                              <div className="text-red-600 font-bold">232: {item.section232HtsCode || 'N/A'}</div>
                            </td>
                            <td className="border border-gray-300 p-2 font-mono text-xs">
                              {additionalCodes2.map((code, i) => (
                                <div key={i} className={code.startsWith('232') ? 'text-red-600 font-bold' : 'text-blue-600'}>{code}</div>
                              ))}
                            </td>
                            <td className="border border-gray-300 p-2">{item.countryOfOrigin || 'N/A'}</td>
                            <td className="border border-gray-300 p-2 text-center">{item.quantity || 'N/A'}</td>
                            <td className="border border-gray-300 p-2 text-right">Allocated</td>
                            <td className="border border-gray-300 p-2 text-right font-medium">${metalValue.toFixed(2)}</td>
                            <td className="border border-gray-300 p-2 text-center text-xs">
                              <span className="text-red-600 font-bold">{tariffs2.join(', ')}</span>
                              {item.ieepaExclusion && <div className="text-red-600">Excl: {item.ieepaExclusion}</div>}
                            </td>
                          </tr>
                        );
                      } else {
                        // Standard single row
                        const tariffs = [];
                        if (item.section232Applicable) tariffs.push('232');
                        if (item.section301Applicable) tariffs.push('301');
                        if (item.ieepaApplicable) tariffs.push('IEEPA');
                        
                        const codes = getAdditionalTariffCodes(item);
                        const additionalCodes = [];
                        if (codes.section232) additionalCodes.push(`232: ${codes.section232}`);
                        if (codes.section301) additionalCodes.push(`301: ${codes.section301}`);
                        if (codes.ieepa) additionalCodes.push(`IEEPA: ${codes.ieepa}`);
                        
                        rows.push(
                          <tr key={index}>
                            <td className="border border-gray-300 p-2">
                              <div className="font-medium">{item.description || 'N/A'}</div>
                              <div className="text-gray-600">{item.productCategory}</div>
                              {item.manufacturer && <div className="text-gray-500">Mfg: {item.manufacturer}</div>}
                            </td>
                            <td className="border border-gray-300 p-2 font-mono">{effectiveHtsCode || 'N/A'}</td>
                            <td className="border border-gray-300 p-2 font-mono text-xs">
                              {additionalCodes.length > 0 ? additionalCodes.map((code, i) => (
                                <div key={i} className={code.startsWith('232') ? 'text-red-600 font-bold' : 'text-blue-600'}>{code}</div>
                              )) : 'None'}
                            </td>
                            <td className="border border-gray-300 p-2">{item.countryOfOrigin || 'N/A'}</td>
                            <td className="border border-gray-300 p-2 text-center">{item.quantity || 'N/A'}</td>
                            <td className="border border-gray-300 p-2 text-right">${item.unitPrice || '0.00'}</td>
                            <td className="border border-gray-300 p-2 text-right font-medium">${item.totalValue || '0.00'}</td>
                            <td className="border border-gray-300 p-2 text-center text-xs">
                              {tariffs.join(', ') || 'None'}
                              {item.ieepaExclusion && <div className="text-red-600">Excl: {item.ieepaExclusion}</div>}
                            </td>
                          </tr>
                        );
                      }
                      
                      return rows;
                    }).flat()}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 font-bold">
                      <td colSpan="6" className="border border-gray-300 p-2 text-right">TOTAL:</td>
                      <td className="border border-gray-300 p-2 text-right">${totals.totalValue.toFixed(2)} USD</td>
                      <td className="border border-gray-300 p-2"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Compliance Information */}
              {warnings.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2 border-b border-gray-400 text-red-700">COMPLIANCE WARNINGS</h3>
                  <ul className="text-xs text-red-600 list-disc list-inside">
                    {warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Footer */}
              <div className="text-xs text-gray-500 border-t border-gray-300 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div><strong>Currency:</strong> USD</div>
                    <div><strong>Total Items:</strong> {totals.totalItems}</div>
                  </div>
                  <div className="text-right">
                    <div>Generated by US Customs Commercial Invoice Generator</div>
                    <div>{new Date().toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Preview Modal */}
      {showInvoicePreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">Generated Commercial Invoice</h2>
              <button
                onClick={() => setShowInvoicePreview(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm font-mono bg-gray-50 p-4 rounded border">
                {generatedInvoiceData}
              </pre>
            </div>
            <div className="p-4 border-t border-gray-200 flex gap-4">
              <button
                onClick={copyToClipboard}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy to Clipboard
              </button>
              <button
                onClick={downloadInvoice}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <Download className="h-4 w-4 mr-2" />
                Download as Text
              </button>
              <button
                onClick={openPrintableInvoice}
                className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print/PDF Version
              </button>
              <button
                onClick={() => setShowInvoicePreview(false)}
                className="flex items-center px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600">Total Items: {totals.totalItems}</p>
            <p className="text-lg font-semibold text-gray-800">Total Value: ${totals.totalValue.toFixed(2)} USD</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={generateInvoice}
              className="flex items-center px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <FileText className="h-4 w-4 mr-2" />
              Generate Invoice
            </button>
            <button
              onClick={openPrintableInvoice}
              className="flex items-center px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print/PDF
            </button>
          </div>
        </div>
      </div>

      {/* Compliance Information */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex items-center mb-2">
          <Info className="h-5 w-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-semibold text-blue-800">Compliance Information</h3>
        </div>
        <div className="text-sm text-blue-700 space-y-1">
          <p>• <strong>Section 232:</strong> Steel products are subject to 25% tariffs and aluminum products to 10% tariffs, with recent updates expanding coverage to derivative products.</p>
          <p>• <strong>Section 301:</strong> Various Chinese goods are subject to additional tariffs ranging from 7.5% to 25%.</p>
          <p>• <strong>IEEPA Tariffs (Current as of July 2025):</strong></p>
          <div className="ml-4">
            <p>- China/Hong Kong/Macau: 10% reciprocal tariffs (30% total baseline with existing tariffs)</p>
            <p>- Canada: 25% general tariffs (10% on energy resources)</p>
            <p>- Mexico: 25% general tariffs</p>
            <p>- China exclusions available under HTS codes 9903.01.28 and 9903.01.30-33</p>
          </div>
          <p>• <strong>HTS Codes:</strong> 10-digit codes are required for all imports, with the first 6 digits being the international HS code.</p>
          <p>• <strong>Data Source:</strong> {apiStatus.lastUpdated ? 'Live USITC API data' : 'Offline reference data'} - Tariff rates and classifications are automatically updated from official sources.</p>
          <p>• <strong>Important:</strong> Current tariff rates include temporary agreements and are subject to change. Always verify current rates with CBP before importing.</p>
        </div>
      </div>
    </div>
  );
};

export default CustomsInvoiceGenerator;
