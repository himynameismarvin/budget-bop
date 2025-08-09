import { NextRequest, NextResponse } from 'next/server';
import { AITransactionParser, TransactionParsingRequest } from '@/lib/ai-transaction-parser';

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header to verify user (optional for now)
    const authHeader = request.headers.get('authorization');

    const requestData: TransactionParsingRequest = await request.json();

    if (!requestData.text) {
      return NextResponse.json(
        { error: 'Missing text data to parse' },
        { status: 400 }
      );
    }

    // Use the AI parser (which will use server-side environment variables)
    const result = await AITransactionParser.parseTransactions(requestData);

    return NextResponse.json({
      content: JSON.stringify({ transactions: result.transactions }),
      success: true
    });

  } catch (error) {
    console.error('Transaction parsing API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to parse transactions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}