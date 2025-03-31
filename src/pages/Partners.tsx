
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BottomNavigation from '@/components/layout/BottomNavigation';

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
};

const mockProducts: Product[] = [
  {
    id: 'prod1',
    name: 'Motorcycle Helmet',
    description: 'Premium safety helmet for riders',
    price: 2500,
    image: '/lovable-uploads/e30d2010-d04d-4e54-b564-033da8613f0b.png'
  },
  {
    id: 'prod2',
    name: 'Rain Coat',
    description: 'Waterproof coat for rainy days',
    price: 1200,
    image: '/lovable-uploads/92f50cbc-8a9a-4634-b7fa-d3b0bbf59202.png'
  },
  {
    id: 'prod3',
    name: 'Phone Holder',
    description: 'Secure phone mount for your vehicle',
    price: 600,
    image: '/lovable-uploads/498e0bf1-4c8a-4cad-8ee2-6f43fdccc511.png'
  }
];

const Partners: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="bg-black text-white p-6">
        <button 
          onClick={() => navigate('/')}
          className="mb-4 flex items-center text-white"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back
        </button>
        
        <h1 className="text-2xl font-bold">Partners</h1>
        <p className="text-gray-300">Shop products from our partners</p>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-1 gap-6">
          {mockProducts.map((product) => (
            <div key={product.id} className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="h-48 bg-gray-100">
                <img 
                  src={product.image} 
                  alt={product.name} 
                  className="w-full h-full object-contain p-4"
                />
              </div>
              
              <div className="p-4">
                <h3 className="font-medium text-lg mb-1">{product.name}</h3>
                <p className="text-gray-600 mb-3">{product.description}</p>
                
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold">RS {product.price}</span>
                  <Button size="sm" className="bg-black text-white">
                    <ShoppingCart size={16} className="mr-2" />
                    Add to Cart
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <BottomNavigation />
    </div>
  );
};

export default Partners;
