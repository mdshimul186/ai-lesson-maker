import React, { useEffect } from 'react';
import { Card, Typography, Table, Tag, Spin } from 'antd';
import { useAccountStore } from '../../stores';
// Ensure the Transaction type is correctly imported from the right path
type Transaction = {
  id: string;
  created_at: string;
  transaction_type: 'purchase' | 'deduction' | 'refund';
  amount: number;
  description: string;
}

const { Title, Text, Paragraph } = Typography;

const TransactionHistory: React.FC = () => {
  const { 
    currentAccount,
    transactions,
    fetchTransactions,
    isLoading,
  } = useAccountStore();

  useEffect(() => {
    if (currentAccount) {
      fetchTransactions(currentAccount.id);
    }
  }, [currentAccount, fetchTransactions]);

  const transactionColumns = [
    {
      title: 'Date',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => new Date(text).toLocaleString(),
      sorter: (a: Transaction, b: Transaction) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      defaultSortOrder: 'descend' as 'descend'
    },
    {
      title: 'Type',
      dataIndex: 'transaction_type',
      key: 'transaction_type',
      render: (text: string) => {
        const type = text.charAt(0).toUpperCase() + text.slice(1);
        const color = text === 'purchase' ? 'green' : text === 'deduction' ? 'red' : 'blue';
        return <Tag color={color}>{type}</Tag>;
      },
      filters: [
        { text: 'Purchase', value: 'purchase' },
        { text: 'Deduction', value: 'deduction' },
        { text: 'Refund', value: 'refund' }
      ],
      onFilter: (value: string, record: Transaction) => record.transaction_type === value
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number, record: Transaction) => {
        const isPositive = record.transaction_type === 'purchase' || record.transaction_type === 'refund';
        return (
          <Text style={{ color: isPositive ? '#52c41a' : '#ff4d4f', fontWeight: 'bold' }}>
            {isPositive ? '+' : '-'}{amount} credits
          </Text>
        );
      },
      sorter: (a: Transaction, b: Transaction) => a.amount - b.amount
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      width: '35%'
    },
    {
      title: 'Balance Change',
      key: 'balance',
      render: (_: any, record: Transaction) => {
        // This would require backend support to track balance after each transaction
        // For now, we can just show the amount with sign
        const isPositive = record.transaction_type === 'purchase' || record.transaction_type === 'refund';
        return (
          <Text>
            {isPositive ? '+' : '-'}{record.amount} credits
          </Text>
        );
      }
    }
  ];

  if (!currentAccount) {
    return <div>Please select an account first</div>;
  }

  return (
    <Card style={{ borderRadius: 8 }}>
      <Title level={4}>Transaction History</Title>
      <Paragraph type="secondary" style={{ marginBottom: 20 }}>
        View your complete credit purchase and usage history. Each entry shows how credits were added or used in your account.
      </Paragraph>
      
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">Loading transaction history...</Text>
          </div>
        </div>
      ) : transactions.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '30px', backgroundColor: '#f9f9f9' }}>
          <Title level={5}>No Transactions Yet</Title>
          <Paragraph>
            You don't have any credit transactions yet. Transactions will appear here when you purchase or use credits.
          </Paragraph>
        </Card>
      ) : (
        <Table 
          dataSource={transactions as any} 
          columns={transactionColumns as any}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          bordered
          summary={pageData => {
            let totalCredits = 0;

            pageData.forEach(({ transaction_type, amount }: any) => {
              if (transaction_type === 'purchase' || transaction_type === 'refund') {
                totalCredits += amount;
              } else if (transaction_type === 'deduction') {
                totalCredits -= amount;
              }
            });
            
            return (
              <>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={2}>
                    <Text strong>Total Net Change</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1} colSpan={3}>
                    <Text strong style={{ color: totalCredits >= 0 ? '#52c41a' : '#ff4d4f' }}>
                      {totalCredits > 0 ? '+' : ''}{totalCredits} credits
                    </Text>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              </>
            );
          }}
        />
      )}
    </Card>
  );
};

export default TransactionHistory;
