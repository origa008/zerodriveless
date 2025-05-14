
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/context/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, ArrowDown, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import AddFundsForm from '@/components/wallet/AddFundsForm';
import WithdrawForm from '@/components/wallet/WithdrawForm';
import { useToast } from '@/components/ui/use-toast';

const Wallet = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isAddFundsOpen, setIsAddFundsOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('transactions');

  useEffect(() => {
    if (!user?.id) {
      navigate('/login');
      return;
    }

    const fetchWalletData = async () => {
      setIsLoading(true);
      try {
        // Fetch wallet balance
        const { data: wallet, error: walletError } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', user.id)
          .single();

        if (walletError) {
          throw walletError;
        }

        setBalance(wallet?.balance || 0);

        // Fetch transactions
        const { data: txData, error: txError } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (txError) {
          throw txError;
        }

        setTransactions(txData || []);
      } catch (error: any) {
        console.error('Error fetching wallet data:', error);
        toast({
          title: 'Error',
          description: 'Could not load wallet data',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchWalletData();

    // Setup real-time subscription for wallet changes
    const walletChannel = supabase
      .channel('wallet_changes')
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'wallets',
          filter: `user_id=eq.${user.id}`
        }, 
        fetchWalletData
      )
      .subscribe();

    // Setup real-time subscription for new transactions
    const transactionChannel = supabase
      .channel('transaction_changes')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'transactions',
          filter: `user_id=eq.${user.id}`
        }, 
        fetchWalletData
      )
      .subscribe();

    return () => {
      supabase.removeChannel(walletChannel);
      supabase.removeChannel(transactionChannel);
    };
  }, [user, navigate, toast]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400';
      case 'pending':
        return 'text-yellow-400';
      case 'failed':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container max-w-md mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6 text-center">Wallet</h1>
        
        {/* Balance Card */}
        <Card className="p-6 mb-6 bg-[#1A1F2C] border-none text-white">
          <h2 className="text-gray-400 mb-1 text-sm">Current Balance</h2>
          <div className="text-3xl font-bold mb-4">{balance} RS</div>
          
          <div className="grid grid-cols-2 gap-4">
            <Button 
              onClick={() => setIsAddFundsOpen(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Plus size={18} />
              Add Funds
            </Button>
            <Button 
              onClick={() => setIsWithdrawOpen(true)}
              variant="outline"
              className="flex items-center gap-2 border-white/20 text-white hover:bg-white/10"
            >
              <ArrowDown size={18} />
              Withdraw
            </Button>
          </div>
        </Card>
        
        {/* Transactions */}
        <Tabs 
          value={selectedTab} 
          onValueChange={setSelectedTab}
          className="w-full"
        >
          <TabsList className="grid grid-cols-2 mb-4 bg-[#1A1F2C]">
            <TabsTrigger value="transactions" className="text-white data-[state=active]:bg-[#2A2F3C]">
              Transactions
            </TabsTrigger>
            <TabsTrigger value="deposits" className="text-white data-[state=active]:bg-[#2A2F3C]">
              Deposits
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="transactions" className="mt-0">
            <div className="rounded-md bg-[#1A1F2C] overflow-hidden">
              {isLoading ? (
                <div className="p-4 text-center">Loading transactions...</div>
              ) : transactions.length === 0 ? (
                <div className="p-4 text-center text-gray-400">
                  No transactions yet
                </div>
              ) : (
                <div>
                  {transactions.map((tx) => (
                    <div 
                      key={tx.id} 
                      className="p-4 border-b border-white/10 last:border-b-0"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}</div>
                          <div className="text-sm text-gray-400">{formatDate(tx.created_at)}</div>
                          {tx.description && (
                            <div className="text-sm text-gray-400 mt-1">{tx.description}</div>
                          )}
                        </div>
                        <div className="flex flex-col items-end">
                          <div className="font-semibold">
                            {tx.type === 'deposit' ? '+' : '-'}{tx.amount} RS
                          </div>
                          <div className={`text-xs ${getStatusColor(tx.status)}`}>
                            {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="deposits" className="mt-0">
            <div className="rounded-md bg-[#1A1F2C] overflow-hidden">
              {/* Filter only deposit transactions */}
              {isLoading ? (
                <div className="p-4 text-center">Loading deposits...</div>
              ) : transactions.filter(tx => tx.type === 'deposit').length === 0 ? (
                <div className="p-4 text-center text-gray-400">
                  No deposits yet
                </div>
              ) : (
                <div>
                  {transactions
                    .filter(tx => tx.type === 'deposit')
                    .map((tx) => (
                      <div 
                        key={tx.id} 
                        className="p-4 border-b border-white/10 last:border-b-0 flex justify-between items-center"
                      >
                        <div className="flex items-center">
                          {tx.status === 'completed' ? (
                            <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                          ) : tx.status === 'pending' ? (
                            <Clock className="h-5 w-5 text-yellow-400 mr-2" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                          )}
                          <div>
                            <div className="font-medium">Deposit</div>
                            <div className="text-sm text-gray-400">{formatDate(tx.created_at)}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">+{tx.amount} RS</div>
                          <div className={`text-xs ${getStatusColor(tx.status)}`}>
                            {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                          </div>
                        </div>
                      </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {isAddFundsOpen && (
        <AddFundsForm 
          onClose={() => setIsAddFundsOpen(false)}
          onSuccess={() => {
            setIsAddFundsOpen(false);
            toast({
              title: 'Deposit Request Submitted',
              description: 'Your deposit request has been submitted for processing.',
            });
          }} 
        />
      )}
      
      {isWithdrawOpen && (
        <WithdrawForm 
          onClose={() => setIsWithdrawOpen(false)}
          onSuccess={() => {
            setIsWithdrawOpen(false);
            toast({
              title: 'Withdrawal Requested',
              description: 'Your withdrawal request has been submitted.',
            });
          }}
          currentBalance={balance}
        />
      )}
    </div>
  );
};

export default Wallet;
