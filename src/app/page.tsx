'use client';
import React, { useState, useEffect } from 'react';
import { AlertCircle, Info, Download, Plus, Trash2, Copy, FileText, Printer } from 'lucide-react';

const CustomsInvoiceGenerator = () => {
  const [invoice, setInvoice] = useState({
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    exporter: {
      name: '',
      address: '',
      city: '',
      country: '',
      postcode: '',
      taxId: '',
      phone: ''
    },
    importer: {
      name: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      taxId: ''
    },
    broker: {
      name: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      licenseNumber: ''
    },
    shipTo: {
      name: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      phone: ''
    },
    shipment: {
      portOfLoading: '',
      portOfEntry: '',
      termsOfSale: 'FOB',
      currency: 'USD',
      totalWeight: '',
      weightUnit: 'KG',
      numberOfCartons: '',
      awbBolNumber: ''
    },
    items: [{
      description: '',
      productCategory: '',
      quantity: '',
      unitPrice: '',
      totalValue: '',
      htsCode: '',
      customHtsCode: '',
      countryOfOrigin: '',
      manufacturer: '',
      ieepaExclusion: '',
      section232Applicable: false,
      section232MetalValue: '',
      section232HtsCode: '',
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

  const section232Codes = {
    steel: ['7202', '7203', '7204', '7205', '7206', '7207', '7208', '7209', '7210', '7211', '7212', '7213', '7214', '7215', '7216', '7217', '7218', '7219', '7220', '7221', '7222', '7223', '7224', '7225', '7226', '7227', '7228', '7229'],
    aluminum: ['7601', '7602', '7603', '7604', '7605', '7606', '7607', '7608', '7609', '7610', '7611', '7612', '7613', '7614', '7615', '7616']
  };

  const section301Codes = ['8528', '8529', '8530', '8531', '8532', '8533', '8534', '8535', '8536', '8537', '8538', '8539', '8540', '8541', '8542', '8543', '8544', '8545', '8546', '8547', '8548', '9403', '9401', '9402', '9404', '9405', '9406', '3920', '3921', '3922', '3923', '3924', '3925', '3926'];

  const ieepaCountries = {
    'China': { rate: 10, description: 'Reciprocal tariffs' },
    'CN': { rate: 10, description: 'Reciprocal tariffs' },
    'Hong Kong': { rate: 10, description: 'Reciprocal tariffs' },
    'HK': { rate: 10, description: 'Reciprocal tariffs' },
    'Macau': { rate: 10, description: 'Reciprocal tariffs' },
    'MO': { rate: 10, description: 'Reciprocal tariffs' },
    'Canada': { rate: 25, description: 'IEEPA tariffs' },
    'CA': { rate: 25, description: 'IEEPA tariffs' },
    'Mexico': { rate: 25, description: 'IEEPA tariffs' },
    'MX': { rate: 25, description: 'IEEPA tariffs' }
  };

  const chinaExclusions = {
    '9903.01.28': 'General exclusion category',
    '9903.01.30': 'Specific product exclusion',
    '9903.01.31': 'Specific product exclusion',
    '9903.01.32': 'Specific product exclusion',
    '9903.01.33': 'Specific product exclusion'
  };

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

  useEffect(() => {
    const totalValue = invoice.items.reduce((sum, item) => {
      const value = parseFloat(item.totalValue) || 0;
      return sum + value;
    }, 0);
    
    setTotals({ totalValue, totalItems: invoice.items.length });
  }, [invoice.items]);

  useEffect(() => {
    const newWarnings = [];
    
    invoice.items.forEach((item, index) => {
      const effectiveHtsCode = item.productCategory === 'CUSTOM' ? item.customHtsCode : item.htsCode;
      
      if (!effectiveHtsCode) {
        newWarnings.push(`Item ${index + 1}: HTS code is required`);
      }
      if (!item.countryOfOrigin) {
        newWarnings.push(`Item ${index + 1}: Country of origin is required`);
      }
      if (!item.manufacturer) {
        newWarnings.push(`Item ${index + 1}: Manufacturer information is required`);
      }
      
      if (item.section232Applicable) {
        const metalValue = parseFloat(item.section232MetalValue) || 0;
        const totalValue = parseFloat(item.totalValue) || 0;
        
        if (!item.section232MetalValue || metalValue <= 0) {
          newWarnings.push(`Item ${index + 1}: Section 232 metal component value is required`);
        }
        if (!item.section232HtsCode) {
          newWarnings.push(`Item ${index + 1}: Section 232 specific HTS code is required`);
        }
        if (metalValue >= totalValue) {
          newWarnings.push(`Item ${index + 1}: Metal component value cannot exceed total value`);
        }
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
        unitPrice: '',
        totalValue: '',
        htsCode: '',
        customHtsCode: '',
        countryOfOrigin: '',
        manufacturer: '',
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
          
          if (field === 'productCategory') {
            if (value === 'CUSTOM') {
              updatedItem.htsCode = '';
              updatedItem.customHtsCode = '';
            } else {
              updatedItem.htsCode = commonHtsCodes[value] || '';
              updatedItem.customHtsCode = '';
              
              if (updatedItem.htsCode && updatedItem.countryOfOrigin) {
                const detection = autoDetectTariffsFromApi(updatedItem.htsCode, updatedItem.countryOfOrigin);
                updatedItem.section232Applicable = detection.section232;
                updatedItem.section301Applicable = detection.section301;
                updatedItem.ieepaApplicable = detection.ieepa;
              }
            }
          }
          
          if (field === 'customHtsCode' && value.length >= 4) {
            if (updatedItem.countryOfOrigin) {
              const detection = autoDetectTariffsFromApi(value, updatedItem.countryOfOrigin);
              updatedItem.section232Applicable = detection.section232;
              updatedItem.section301Applicable = detection.section301;
              updatedItem.ieepaApplicable = detection.ieepa;
            }
          }
          
          if (field === 'countryOfOrigin') {
            const effectiveHtsCode = updatedItem.productCategory === 'CUSTOM' ? updatedItem.customHtsCode : updatedItem.htsCode;
            if (effectiveHtsCode && effectiveHtsCode.length >= 4) {
              const detection = autoDetectTariffsFromApi(effectiveHtsCode, value);
              updatedItem.section232Applicable = detection.section232;
              updatedItem.section301Applicable = detection.section301;
              updatedItem.ieepaApplicable = detection.ieepa;
            } else {
              updatedItem.ieepaApplicable = !!ieepaCountries[value];
            }
          }
          
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
    let itemsText = '';
    let itemCounter = 1;
    
    invoice.items.forEach((item) => {
      const effectiveHtsCode = item.productCategory === 'CUSTOM' ? item.customHtsCode : item.htsCode;
      const totalValue = parseFloat(item.totalValue) || 0;
      const metalValue = parseFloat(item.section232MetalValue) || 0;
      const nonMetalValue = totalValue - metalValue;
      
      if (item.section232Applicable && metalValue > 0 && item.section232HtsCode) {
        // Split into two lines for Section 232 items
        
        // Line 1: Non-metal component
        itemsText += `\nItem ${itemCounter}: ${item.description || 'N/A'} (Non-metal component)
  HTS Code: ${effectiveHtsCode || 'N/A'}
  Country of Origin: ${item.countryOfOrigin || 'N/A'}
  Manufacturer: ${item.manufacturer || 'N/A'}
  Quantity: ${item.quantity || 'N/A'}
  Unit Price: $${(nonMetalValue / (parseFloat(item.quantity) || 1)).toFixed(2)}
  Total Value: $${nonMetalValue.toFixed(2)}
  Tariffs: ${[item.section301Applicable && '301', item.ieepaApplicable && 'IEEPA'].filter(Boolean).join(', ') || 'None'}
  ${item.ieepaExclusion ? `IEEPA Exclusion: ${item.ieepaExclusion}` : ''}
  ${item.notes ? `Notes: ${item.notes}` : ''}`;
        
        itemCounter++;
        
        // Line 2: Metal component
        itemsText += `\nItem ${itemCounter}: ${item.description || 'N/A'} (Metal component - Section 232)
  HTS Code: ${item.section232HtsCode} (Section 232 Metal)
  Country of Origin: ${item.countryOfOrigin || 'N/A'}
  Manufacturer: ${item.manufacturer || 'N/A'}
  Quantity: ${item.quantity || 'N/A'}
  Unit Price: $${(metalValue / (parseFloat(item.quantity) || 1)).toFixed(2)}
  Total Value: $${metalValue.toFixed(2)}
  Tariffs: ${['232', item.section301Applicable && '301', item.ieepaApplicable && 'IEEPA'].filter(Boolean).join(', ')}
  ${item.ieepaExclusion ? `IEEPA Exclusion: ${item.ieepaExclusion}` : ''}
  Metal Component Value: $${metalValue.toFixed(2)}`;
        
      } else {
        // Single line for regular items
        const tariffs = [
          item.section232Applicable && '232',
          item.section301Applicable && '301',
          item.ieepaApplicable && 'IEEPA'
        ].filter(Boolean).join(', ') || 'None';
        
        itemsText += `\nItem ${itemCounter}: ${item.description || 'N/A'}
  HTS Code: ${effectiveHtsCode || 'N/A'}
  Country of Origin: ${item.countryOfOrigin || 'N/A'}
  Manufacturer: ${item.manufacturer || 'N/A'}
  Quantity: ${item.quantity || 'N/A'}
  Unit Price: $${item.unitPrice || '0.00'}
  Total Value: $${item.totalValue || '0.00'}
  Tariffs: ${tariffs}
  ${item.ieepaExclusion ? `IEEPA Exclusion: ${item.ieepaExclusion}` : ''}
  ${item.section232Applicable && item.section232MetalValue ? `Section 232 Metal Value: $${item.section232MetalValue}` : ''}
  ${item.notes ? `Notes: ${item.notes}` : ''}`;
      }
      
      itemCounter++;
    });

    const formattedInvoice = `COMMERCIAL INVOICE
==================

Invoice Number: ${invoice.invoiceNumber || 'N/A'}
Invoice Date: ${invoice.invoiceDate}
AWB/BOL: ${invoice.shipment.awbBolNumber || 'N/A'}

EXPORTER INFORMATION
Company: ${invoice.exporter.name || 'N/A'}
Tax ID: ${invoice.exporter.taxId || 'N/A'}
Address: ${invoice.exporter.address || 'N/A'}
City: ${invoice.exporter.city || 'N/A'}
Country: ${invoice.exporter.country || 'N/A'}
Postcode: ${invoice.exporter.postcode || 'N/A'}

IMPORTER INFORMATION
Company: ${invoice.importer.name || 'N/A'}
Tax ID: ${invoice.importer.taxId || 'N/A'}
Address: ${invoice.importer.address || 'N/A'}
City: ${invoice.importer.city || 'N/A'}, ${invoice.importer.state || 'N/A'} ${invoice.importer.zip || 'N/A'}

BROKER INFORMATION
Company: ${invoice.broker.name || 'N/A'}
License: ${invoice.broker.licenseNumber || 'N/A'}
Address: ${invoice.broker.address || 'N/A'}
City: ${invoice.broker.city || 'N/A'}, ${invoice.broker.state || 'N/A'} ${invoice.broker.zip || 'N/A'}

SHIP-TO ADDRESS
Company: ${invoice.shipTo.name || 'N/A'}
Address: ${invoice.shipTo.address || 'N/A'}
City: ${invoice.shipTo.city || 'N/A'}, ${invoice.shipTo.state || 'N/A'} ${invoice.shipTo.zip || 'N/A'}

SHIPMENT DETAILS
Port of Loading: ${invoice.shipment.portOfLoading || 'N/A'}
Port of Entry: ${invoice.shipment.portOfEntry || 'N/A'}
Terms: ${invoice.shipment.termsOfSale}
Weight: ${invoice.shipment.totalWeight || 'N/A'} ${invoice.shipment.weightUnit}
Cartons: ${invoice.shipment.numberOfCartons || 'N/A'}

ITEMS
=====${itemsText}

TOTALS
Total Items: ${totals.totalItems}
Total Value: ${totals.totalValue.toFixed(2)} ${invoice.shipment.currency}

${warnings.length > 0 ? 'WARNINGS:\n' + warnings.map(w => `- ${w}`).join('\n') : 'No warnings'}
`;

    setGeneratedInvoiceData(formattedInvoice);
    setShowInvoicePreview(true);
  };

  const downloadInvoice = () => {
    const blob = new Blob([generatedInvoiceData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${invoice.invoiceNumber || 'draft'}.txt`;
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
      alert('Copy failed. Please select and copy manually.');
    }
  };

  const openPrintableInvoice = () => {
    setShowPrintableInvoice(true);
  };

  const printInvoice = () => {
    // Use a more reliable approach for printing
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">US Customs Commercial Invoice Generator</h1>
        <p className="text-gray-600">Generate compliant commercial invoices with tariff validation</p>
        
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
            placeholder="Tax ID"
            value={invoice.exporter.taxId}
            onChange={(e) => updateInvoiceField('exporter', 'taxId', e.target.value)}
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
          <input
            type="text"
            placeholder="Postcode"
            value={invoice.exporter.postcode}
            onChange={(e) => updateInvoiceField('exporter', 'postcode', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Phone"
            value={invoice.exporter.phone}
            onChange={(e) => updateInvoiceField('exporter', 'phone', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

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
            placeholder="Tax ID"
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

      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-3">Customs Broker</h2>
        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Broker Name"
            value={invoice.broker.name}
            onChange={(e) => updateInvoiceField('broker', 'name', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="License Number"
            value={invoice.broker.licenseNumber}
            onChange={(e) => updateInvoiceField('broker', 'licenseNumber', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Address"
            value={invoice.broker.address}
            onChange={(e) => updateInvoiceField('broker', 'address', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="City"
            value={invoice.broker.city}
            onChange={(e) => updateInvoiceField('broker', 'city', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="State"
            value={invoice.broker.state}
            onChange={(e) => updateInvoiceField('broker', 'state', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="ZIP Code"
            value={invoice.broker.zip}
            onChange={(e) => updateInvoiceField('broker', 'zip', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-3">Ship-To Address</h2>
        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Company Name"
            value={invoice.shipTo.name}
            onChange={(e) => updateInvoiceField('shipTo', 'name', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Phone"
            value={invoice.shipTo.phone}
            onChange={(e) => updateInvoiceField('shipTo', 'phone', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Address"
            value={invoice.shipTo.address}
            onChange={(e) => updateInvoiceField('shipTo', 'address', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="City"
            value={invoice.shipTo.city}
            onChange={(e) => updateInvoiceField('shipTo', 'city', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="State"
            value={invoice.shipTo.state}
            onChange={(e) => updateInvoiceField('shipTo', 'state', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="ZIP Code"
            value={invoice.shipTo.zip}
            onChange={(e) => updateInvoiceField('shipTo', 'zip', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-3">Shipment Information</h2>
        <div className="grid grid-cols-4 gap-4">
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
          <select
            value={invoice.shipment.currency}
            onChange={(e) => updateInvoiceField('shipment', 'currency', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="CAD">CAD</option>
            <option value="CNY">CNY</option>
          </select>
        </div>
        
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="flex">
            <input
              type="number"
              step="0.01"
              placeholder="Total Weight"
              value={invoice.shipment.totalWeight}
              onChange={(e) => updateInvoiceField('shipment', 'totalWeight', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={invoice.shipment.weightUnit}
              onChange={(e) => updateInvoiceField('shipment', 'weightUnit', e.target.value)}
              className="px-3 py-2 border-l-0 border border-gray-300 rounded-r-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="KG">KG</option>
              <option value="LB">LB</option>
            </select>
          </div>
          <input
            type="number"
            placeholder="Number of Cartons"
            value={invoice.shipment.numberOfCartons}
            onChange={(e) => updateInvoiceField('shipment', 'numberOfCartons', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="AWB/BOL Number"
            value={invoice.shipment.awbBolNumber}
            onChange={(e) => updateInvoiceField('shipment', 'awbBolNumber', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Invoice Items</h2>
          <button
            onClick={addItem}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) => updateItem(index, 'description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Product description"
                />
              </div>
              
              {item.productCategory === 'CUSTOM' && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Custom HTS Code</label>
                  <input
                    type="text"
                    value={item.customHtsCode}
                    onChange={(e) => updateItem(index, 'customHtsCode', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="1234567890"
                    maxLength="10"
                  />
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
                <input
                  type="text"
                  value={item.manufacturer}
                  onChange={(e) => updateItem(index, 'manufacturer', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ABC Manufacturing"
                />
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price ({invoice.shipment.currency})</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Value ({invoice.shipment.currency})</label>
                <input
                  type="number"
                  step="0.01"
                  value={item.totalValue}
                  onChange={(e) => updateItem(index, 'totalValue', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="1050.00"
                />
              </div>
            </div>

            {['China', 'CN', 'Hong Kong', 'HK', 'Macau', 'MO'].includes(item.countryOfOrigin) && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">IEEPA Exclusion</label>
                <select
                  value={item.ieepaExclusion}
                  onChange={(e) => updateItem(index, 'ieepaExclusion', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No exclusion</option>
                  {Object.entries(chinaExclusions).map(([code, description]) => (
                    <option key={code} value={code}>{code} - {description}</option>
                  ))}
                </select>
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
                <span className="text-sm text-gray-700">Section 232</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={item.section301Applicable}
                  onChange={(e) => updateItem(index, 'section301Applicable', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Section 301</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={item.ieepaApplicable}
                  onChange={(e) => updateItem(index, 'ieepaApplicable', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">IEEPA</span>
              </label>
            </div>

            {item.section232Applicable && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <h4 className="text-md font-semibold text-yellow-800 mb-3">Section 232 Details</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Metal Value ({invoice.shipment.currency})</label>
                    <input
                      type="number"
                      step="0.01"
                      value={item.section232MetalValue}
                      onChange={(e) => updateItem(index, 'section232MetalValue', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="250.00"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Section 232 HTS Code</label>
                    <select
                      value={item.section232HtsCode}
                      onChange={(e) => updateItem(index, 'section232HtsCode', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Metal Type</option>
                      {Object.entries(section232SpecificCodes).map(([description, code]) => (
                        <option key={code} value={code}>{description} - {code}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={item.notes}
                onChange={(e) => updateItem(index, 'notes', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="2"
                placeholder="Additional notes"
              />
            </div>
          </div>
        ))}
      </div>

      {showPrintableInvoice && (
        <div className="fixed inset-0 bg-white z-50 overflow-auto">
          <style jsx>{`
            @media print {
              .print-hidden { display: none !important; }
              body { margin: 0; }
              .print-content { 
                max-width: none !important; 
                margin: 0 !important; 
                padding: 20px !important; 
              }
            }
          `}</style>
          
          <div className="max-w-4xl mx-auto p-8 print-content">
            <div className="mb-6 flex gap-4 print-hidden">
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

            <div className="bg-white">
              <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
                <h1 className="text-2xl font-bold mb-2">COMMERCIAL INVOICE</h1>
                <div className="text-sm text-gray-600">
                  Invoice No: {invoice.invoiceNumber || 'N/A'} | Date: {invoice.invoiceDate}
                </div>
                {invoice.shipment.awbBolNumber && (
                  <div className="text-sm text-gray-600 mt-1">
                    AWB/BOL: {invoice.shipment.awbBolNumber}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-8 mb-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2 border-b border-gray-400">EXPORTER</h3>
                  <div className="text-sm">
                    <div className="font-medium">{invoice.exporter.name || 'N/A'}</div>
                    {invoice.exporter.taxId && <div className="text-gray-600">Tax ID: {invoice.exporter.taxId}</div>}
                    <div>{invoice.exporter.address || 'N/A'}</div>
                    <div>{invoice.exporter.city || 'N/A'}, {invoice.exporter.country || 'N/A'} {invoice.exporter.postcode || ''}</div>
                    {invoice.exporter.phone && <div>Phone: {invoice.exporter.phone}</div>}
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

              <div className="grid grid-cols-2 gap-8 mb-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2 border-b border-gray-400">CUSTOMS BROKER</h3>
                  <div className="text-sm">
                    <div className="font-medium">{invoice.broker.name || 'N/A'}</div>
                    {invoice.broker.licenseNumber && <div className="text-gray-600">License: {invoice.broker.licenseNumber}</div>}
                    <div>{invoice.broker.address || 'N/A'}</div>
                    <div>{invoice.broker.city || 'N/A'}, {invoice.broker.state || 'N/A'} {invoice.broker.zip || ''}</div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2 border-b border-gray-400">SHIP-TO ADDRESS</h3>
                  <div className="text-sm">
                    <div className="font-medium">{invoice.shipTo.name || 'N/A'}</div>
                    <div>{invoice.shipTo.address || 'N/A'}</div>
                    <div>{invoice.shipTo.city || 'N/A'}, {invoice.shipTo.state || 'N/A'} {invoice.shipTo.zip || ''}</div>
                    {invoice.shipTo.phone && <div>Phone: {invoice.shipTo.phone}</div>}
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2 border-b border-gray-400">SHIPMENT DETAILS</h3>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div><strong>Port of Loading:</strong> {invoice.shipment.portOfLoading || 'N/A'}</div>
                  <div><strong>Port of Entry:</strong> {invoice.shipment.portOfEntry || 'N/A'}</div>
                  <div><strong>Terms:</strong> {invoice.shipment.termsOfSale}</div>
                  <div><strong>Currency:</strong> {invoice.shipment.currency}</div>
                  <div><strong>Total Weight:</strong> {invoice.shipment.totalWeight || 'N/A'} {invoice.shipment.weightUnit}</div>
                  <div><strong>Cartons:</strong> {invoice.shipment.numberOfCartons || 'N/A'}</div>
                  <div><strong>AWB/BOL:</strong> {invoice.shipment.awbBolNumber || 'N/A'}</div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2 border-b border-gray-400">ITEMS</h3>
                <table className="w-full text-xs border-collapse border border-gray-300">
                  <thead>
                    <tr style={{backgroundColor: '#f0f0f0'}}>
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
                      
                      // Check if this item should be split for Section 232
                      const shouldSplit = item.section232Applicable && metalValue > 0 && item.section232HtsCode;
                      
                      if (shouldSplit) {
                        // Return array of two JSX elements for Section 232 items
                        const nonMetalTariffs = [];
                        if (item.section301Applicable) nonMetalTariffs.push('301');
                        if (item.ieepaApplicable) nonMetalTariffs.push('IEEPA');
                        
                        const metalTariffs = ['232'];
                        if (item.section301Applicable) metalTariffs.push('301');
                        if (item.ieepaApplicable) metalTariffs.push('IEEPA');
                        
                        return [
                          // First row: Non-metal component
                          <tr key={`${index}-nonmetal`}>
                            <td className="border border-gray-300 p-2">
                              <div className="font-medium">{item.description || 'N/A'} (Non-metal component)</div>
                              <div style={{color: '#666'}}>{item.productCategory}</div>
                              {item.manufacturer && <div style={{color: '#888'}}>Mfg: {item.manufacturer}</div>}
                            </td>
                            <td className="border border-gray-300 p-2" style={{fontFamily: 'monospace'}}>{effectiveHtsCode || 'N/A'}</td>
                            <td className="border border-gray-300 p-2">{item.countryOfOrigin || 'N/A'}</td>
                            <td className="border border-gray-300 p-2 text-center">{item.quantity || 'N/A'}</td>
                            <td className="border border-gray-300 p-2 text-right">${(nonMetalValue / (parseFloat(item.quantity) || 1)).toFixed(2)}</td>
                            <td className="border border-gray-300 p-2 text-right font-medium">${nonMetalValue.toFixed(2)}</td>
                            <td className="border border-gray-300 p-2 text-center text-xs">
                              {nonMetalTariffs.join(', ') || 'None'}
                              {item.ieepaExclusion && <div style={{color: '#dc2626'}}>Excl: {item.ieepaExclusion}</div>}
                            </td>
                            <td className="border border-gray-300 p-2 text-center text-xs">-</td>
                            <td className="border border-gray-300 p-2 text-center text-xs">
                              {item.section301Applicable ? '9903.88.xx' : '-'}
                            </td>
                            <td className="border border-gray-300 p-2 text-center text-xs">
                              {item.ieepaApplicable ? (item.ieepaExclusion || '9903.01.xx') : '-'}
                            </td>
                          </tr>,
                          // Second row: Metal component (Section 232)
                          <tr key={`${index}-metal`}>
                            <td className="border border-gray-300 p-2">
                              <div className="font-medium">{item.description || 'N/A'} (Metal component - Section 232)</div>
                              <div style={{color: '#666'}}>Section 232 Metal Component</div>
                              {item.manufacturer && <div style={{color: '#888'}}>Mfg: {item.manufacturer}</div>}
                            </td>
                            <td className="border border-gray-300 p-2" style={{fontFamily: 'monospace', backgroundColor: '#fef3c7'}}>{item.section232HtsCode}</td>
                            <td className="border border-gray-300 p-2">{item.countryOfOrigin || 'N/A'}</td>
                            <td className="border border-gray-300 p-2 text-center">{item.quantity || 'N/A'}</td>
                            <td className="border border-gray-300 p-2 text-right">${(metalValue / (parseFloat(item.quantity) || 1)).toFixed(2)}</td>
                            <td className="border border-gray-300 p-2 text-right font-medium" style={{backgroundColor: '#fef3c7'}}>${metalValue.toFixed(2)}</td>
                            <td className="border border-gray-300 p-2 text-center text-xs" style={{backgroundColor: '#fef3c7'}}>
                              {metalTariffs.join(', ')}
                              {item.ieepaExclusion && <div style={{color: '#dc2626'}}>Excl: {item.ieepaExclusion}</div>}
                            </td>
                            <td className="border border-gray-300 p-2 text-center text-xs" style={{backgroundColor: '#fef3c7', fontFamily: 'monospace'}}>
                              {item.section232HtsCode}
                            </td>
                            <td className="border border-gray-300 p-2 text-center text-xs" style={{backgroundColor: '#fef3c7'}}>
                              {item.section301Applicable ? '9903.88.xx' : '-'}
                            </td>
                            <td className="border border-gray-300 p-2 text-center text-xs" style={{backgroundColor: '#fef3c7'}}>
                              {item.ieepaApplicable ? (item.ieepaExclusion || '9903.01.xx') : '-'}
                            </td>
                          </tr>
                        ];
                      } else {
                        // Single row for non-Section 232 items
                        const tariffs = [];
                        if (item.section232Applicable) tariffs.push('232');
                        if (item.section301Applicable) tariffs.push('301');
                        if (item.ieepaApplicable) tariffs.push('IEEPA');
                        
                        return (
                          <tr key={index}>
                            <td className="border border-gray-300 p-2">
                              <div className="font-medium">{item.description || 'N/A'}</div>
                              <div style={{color: '#666'}}>{item.productCategory}</div>
                              {item.manufacturer && <div style={{color: '#888'}}>Mfg: {item.manufacturer}</div>}
                            </td>
                            <td className="border border-gray-300 p-2" style={{fontFamily: 'monospace'}}>{effectiveHtsCode || 'N/A'}</td>
                            <td className="border border-gray-300 p-2">{item.countryOfOrigin || 'N/A'}</td>
                            <td className="border border-gray-300 p-2 text-center">{item.quantity || 'N/A'}</td>
                            <td className="border border-gray-300 p-2 text-right">${item.unitPrice || '0.00'}</td>
                            <td className="border border-gray-300 p-2 text-right font-medium">${item.totalValue || '0.00'}</td>
                            <td className="border border-gray-300 p-2 text-center text-xs">
                              {tariffs.join(', ') || 'None'}
                              {item.ieepaExclusion && <div style={{color: '#dc2626'}}>Excl: {item.ieepaExclusion}</div>}
                            </td>
                            <td className="border border-gray-300 p-2 text-center text-xs" style={{fontFamily: 'monospace'}}>
                              {item.section232Applicable ? (item.section232HtsCode || 'Required') : '-'}
                            </td>
                            <td className="border border-gray-300 p-2 text-center text-xs">
                              {item.section301Applicable ? '9903.88.xx' : '-'}
                            </td>
                            <td className="border border-gray-300 p-2 text-center text-xs">
                              {item.ieepaApplicable ? (item.ieepaExclusion || '9903.01.xx') : '-'}
                            </td>
                          </tr>
                        );
                      }
                    }).flat()}
                  </tbody>
                  </tbody>
                  <tfoot>
                    <tr style={{backgroundColor: '#f0f0f0', fontWeight: 'bold'}}>
                      <td colSpan="5" className="border border-gray-300 p-2 text-right">TOTAL:</td>
                      <td className="border border-gray-300 p-2 text-right">${totals.totalValue.toFixed(2)} {invoice.shipment.currency}</td>
                      <td className="border border-gray-300 p-2"></td>
                      <td className="border border-gray-300 p-2"></td>
                      <td className="border border-gray-300 p-2"></td>
                      <td className="border border-gray-300 p-2"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {warnings.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2 border-b border-gray-400" style={{color: '#dc2626'}}>COMPLIANCE WARNINGS</h3>
                  <ul className="text-xs list-disc list-inside" style={{color: '#dc2626'}}>
                    {warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="text-xs border-t border-gray-300 pt-4" style={{color: '#666'}}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div><strong>Currency:</strong> {invoice.shipment.currency}</div>
                    <div><strong>Total Items:</strong> {totals.totalItems}</div>
                    <div><strong>Total Weight:</strong> {invoice.shipment.totalWeight || 'N/A'} {invoice.shipment.weightUnit}</div>
                    <div><strong>Cartons:</strong> {invoice.shipment.numberOfCartons || 'N/A'}</div>
                  </div>
                  <div className="text-right">
                    <div>Generated by US Customs Commercial Invoice Generator</div>
                    <div>{new Date().toLocaleString()}</div>
                    {invoice.shipment.awbBolNumber && <div><strong>AWB/BOL:</strong> {invoice.shipment.awbBolNumber}</div>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showInvoicePreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">Generated Invoice</h2>
              <button
                onClick={() => setShowInvoicePreview(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm font-mono bg-gray-50 p-4 rounded">
                {generatedInvoiceData}
              </pre>
            </div>
            <div className="p-4 border-t border-gray-200 flex gap-4">
              <button
                onClick={copyToClipboard}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </button>
              <button
                onClick={downloadInvoice}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </button>
              <button
                onClick={openPrintableInvoice}
                className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print/PDF
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600">Total Items: {totals.totalItems}</p>
            <p className="text-lg font-semibold text-gray-800">Total Value: ${totals.totalValue.toFixed(2)} {invoice.shipment.currency}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={generateInvoice}
              className="flex items-center px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              <FileText className="h-4 w-4 mr-2" />
              Generate Invoice
            </button>
            <button
              onClick={openPrintableInvoice}
              className="flex items-center px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print/PDF
            </button>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex items-center mb-2">
          <Info className="h-5 w-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-semibold text-blue-800">Compliance Information</h3>
        </div>
        <div className="text-sm text-blue-700 space-y-1">
          <p>• <strong>Section 232:</strong> Steel and aluminum tariffs (25% and 10% respectively)</p>
          <p>• <strong>Section 301:</strong> China trade tariffs (7.5% to 25%)</p>
          <p>• <strong>IEEPA:</strong> Emergency tariffs on China (10%), Canada/Mexico (25%)</p>
          <p>• <strong>HTS Codes:</strong> 10-digit codes required for all imports</p>
          <p>• <strong>Data Source:</strong> {apiStatus.lastUpdated ? 'Live USITC API data' : 'Offline reference data'} - Tariff rates automatically updated from official sources</p>
          <p>• Always verify current tariff rates with CBP before importing</p>
        </div>
      </div>
    </div>
  );
};

export default CustomsInvoiceGenerator;  