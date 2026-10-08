function jsonString(value) {
  return value == null ? null : JSON.stringify(value);
}

function productResponse(product) {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    price: Number(product.price),
    description: product.description,
    features_json: jsonString(product.features),
    image_url: product.imageUrl,
    created_at: product.createdAt,
    features: product.features
  };
}

function vehicleResponse(vehicle) {
  return {
    id: vehicle.id,
    name: vehicle.name,
    slug: vehicle.slug,
    years: vehicle.years,
    description: vehicle.description,
    features_json: jsonString(vehicle.features),
    specs_json: jsonString(vehicle.specifications),
    gallery_json: jsonString(vehicle.gallery),
    created_at: vehicle.createdAt,
    features: vehicle.features,
    specifications: vehicle.specifications,
    gallery: vehicle.gallery
  };
}

function optionResponse(option) {
  return {
    id: option.id,
    step_id: option.stepId,
    name: option.name,
    description: option.description,
    price: Number(option.price),
    features_json: jsonString(option.features),
    features: option.features
  };
}

function inquiryResponse(inquiry) {
  return {
    id: inquiry.id,
    client_name: inquiry.clientName,
    email: inquiry.email,
    phone: inquiry.phone,
    notes: inquiry.notes,
    selected_options_json: jsonString(inquiry.selectedOptions),
    total_estimate: Number(inquiry.totalEstimate),
    status: inquiry.status,
    created_at: inquiry.createdAt,
    selectedOptions: inquiry.selectedOptions
  };
}

function galleryResponse(item) {
  return {
    id: item.id,
    title: item.title,
    category: item.category,
    image_url: item.imageUrl,
    description: item.description,
    vehicle_tag: item.vehicleTag,
    created_at: item.createdAt
  };
}

function contactMessageResponse(message) {
  return {
    id: message.id,
    name: message.name,
    email: message.email,
    phone: message.phone,
    vehicle: message.vehicle,
    message: message.message,
    status: message.status,
    created_at: message.createdAt
  };
}

module.exports = {
  productResponse,
  vehicleResponse,
  optionResponse,
  inquiryResponse,
  galleryResponse,
  contactMessageResponse
};
