# Wallet and Installment Payment Backend Implementation Guide

## Overview

This guide provides comprehensive instructions for implementing wallet funding and installment payment functionalities on the backend. The implementation includes:

1. **Wallet Funding**: Students can fund their wallet via Paystack
2. **Installment Payment**: Students can pay installments using either wallet balance or direct Paystack payment

---

## Table of Contents

1. [Database Schema](#database-schema)
2. [Wallet Funding Implementation](#wallet-funding-implementation)
3. [Installment Payment Implementation](#installment-payment-implementation)
4. [Paystack Integration](#paystack-integration)
5. [API Endpoints](#api-endpoints)
6. [Error Handling](#error-handling)
7. [Testing](#testing)

---

## Database Schema

### 1. Wallet Entity

Create a `Wallet` entity to track student wallet balances:

```typescript
// wallet.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Student } from './student.entity';
import { WalletTransaction } from './wallet-transaction.entity';

@Entity('wallets')
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  studentId: string;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  student: Student;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  balance: number;

  @OneToMany(() => WalletTransaction, transaction => transaction.wallet)
  transactions: WalletTransaction[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 2. Wallet Transaction Entity

Create a `WalletTransaction` entity to track all wallet transactions:

```typescript
// wallet-transaction.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Wallet } from './wallet.entity';

export enum WalletTransactionType {
  CREDIT = 'CREDIT',      // Money added to wallet
  DEBIT = 'DEBIT',        // Money deducted from wallet
}

export enum WalletTransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

@Entity('wallet_transactions')
export class WalletTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  walletId: string;

  @ManyToOne(() => Wallet, wallet => wallet.transactions, { onDelete: 'CASCADE' })
  wallet: Wallet;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: WalletTransactionType,
  })
  type: WalletTransactionType;

  @Column({
    type: 'enum',
    enum: WalletTransactionStatus,
    default: WalletTransactionStatus.PENDING,
  })
  status: WalletTransactionStatus;

  @Column({ nullable: true })
  reference: string; // Paystack reference or internal reference

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  paymentId: string; // Link to payment record if this is for installment payment

  @CreateDateColumn()
  createdAt: Date;
}
```

### 3. Update Payment Entity

Ensure your `Payment` entity includes fields for wallet payments:

```typescript
// payment.entity.ts (add these fields if not present)
@Column({ nullable: true })
paymentMethod: string; // 'wallet', 'paystack', 'bank-transfer', etc.

@Column({ nullable: true })
walletTransactionId: string; // Reference to wallet transaction if paid via wallet

@Column({ nullable: true })
paystackReference: string; // Paystack transaction reference
```

### 4. Update Payment Schedule Entity

Ensure your payment schedule/installment entity has the necessary fields:

```typescript
// payment-schedule.entity.ts or installment.entity.ts
@Column({ type: 'uuid' })
paymentPlanId: string;

@Column()
installmentNumber: number;

@Column()
totalInstallments: number;

@Column({ type: 'decimal', precision: 10, scale: 2 })
amount: number;

@Column({ type: 'date' })
dueDate: Date;

@Column({
  type: 'enum',
  enum: ['PENDING', 'PAID', 'OVERDUE'],
  default: 'PENDING',
})
status: string;

@Column({ default: true })
canPay: boolean; // Whether this installment can be paid now
```

---

## Wallet Funding Implementation

### 1. Wallet Service

Create a `WalletService` to handle wallet operations:

```typescript
// wallet.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from './wallet.entity';
import { WalletTransaction, WalletTransactionType, WalletTransactionStatus } from './wallet-transaction.entity';
import { PaystackService } from './paystack.service';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private transactionRepository: Repository<WalletTransaction>,
    private paystackService: PaystackService,
  ) {}

  /**
   * Get or create wallet for a student
   */
  async getOrCreateWallet(studentId: string): Promise<Wallet> {
    let wallet = await this.walletRepository.findOne({
      where: { studentId },
      relations: ['student'],
    });

    if (!wallet) {
      wallet = this.walletRepository.create({
        studentId,
        balance: 0,
      });
      wallet = await this.walletRepository.save(wallet);
    }

    return wallet;
  }

  /**
   * Get wallet balance for a student
   */
  async getWalletBalance(studentId: string): Promise<number> {
    const wallet = await this.getOrCreateWallet(studentId);
    return Number(wallet.balance);
  }

  /**
   * Initialize wallet funding via Paystack
   */
  async initializeWalletFunding(
    studentId: string,
    amount: number,
    email: string,
    fullName: string,
  ): Promise<{ authorizationUrl: string; accessCode: string; reference: string }> {
    // Validate amount
    if (amount < 100) {
      throw new BadRequestException('Minimum funding amount is ₦100');
    }

    // Get or create wallet
    const wallet = await this.getOrCreateWallet(studentId);

    // Create pending transaction
    const transaction = this.transactionRepository.create({
      walletId: wallet.id,
      amount,
      type: WalletTransactionType.CREDIT,
      status: WalletTransactionStatus.PENDING,
      description: 'Wallet funding',
    });
    await this.transactionRepository.save(transaction);

    // Initialize Paystack payment
    const paystackResponse = await this.paystackService.initializeTransaction({
      email,
      amount: amount * 100, // Convert to kobo
      reference: transaction.id, // Use transaction ID as reference
      metadata: {
        walletId: wallet.id,
        studentId,
        transactionId: transaction.id,
        type: 'wallet_funding',
      },
      callback_url: `${process.env.FRONTEND_URL}/payments?success=true&reference=${transaction.id}`,
    });

    // Update transaction with Paystack reference
    transaction.reference = paystackResponse.reference;
    await this.transactionRepository.save(transaction);

    return {
      authorizationUrl: paystackResponse.authorization_url,
      accessCode: paystackResponse.access_code,
      reference: paystackResponse.reference,
    };
  }

  /**
   * Verify and complete wallet funding after Paystack callback
   */
  async verifyWalletFunding(reference: string): Promise<WalletTransaction> {
    // Find transaction by reference
    const transaction = await this.transactionRepository.findOne({
      where: { reference },
      relations: ['wallet'],
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.status === WalletTransactionStatus.COMPLETED) {
      return transaction; // Already processed
    }

    // Verify with Paystack
    const verification = await this.paystackService.verifyTransaction(reference);

    if (verification.status === 'success' && verification.amount >= transaction.amount * 100) {
      // Payment successful - credit wallet
      transaction.status = WalletTransactionStatus.COMPLETED;
      await this.transactionRepository.save(transaction);

      // Update wallet balance
      const wallet = transaction.wallet;
      wallet.balance = Number(wallet.balance) + Number(transaction.amount);
      await this.walletRepository.save(wallet);

      return transaction;
    } else {
      // Payment failed
      transaction.status = WalletTransactionStatus.FAILED;
      await this.transactionRepository.save(transaction);
      throw new BadRequestException('Payment verification failed');
    }
  }

  /**
   * Deduct amount from wallet
   */
  async deductFromWallet(
    studentId: string,
    amount: number,
    description: string,
    paymentId?: string,
  ): Promise<WalletTransaction> {
    const wallet = await this.getOrCreateWallet(studentId);

    if (Number(wallet.balance) < amount) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    // Create debit transaction
    const transaction = this.transactionRepository.create({
      walletId: wallet.id,
      amount,
      type: WalletTransactionType.DEBIT,
      status: WalletTransactionStatus.COMPLETED,
      description,
      paymentId,
    });
    await this.transactionRepository.save(transaction);

    // Update wallet balance
    wallet.balance = Number(wallet.balance) - amount;
    await this.walletRepository.save(wallet);

    return transaction;
  }

  /**
   * Get wallet transaction history
   */
  async getTransactionHistory(
    studentId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ transactions: WalletTransaction[]; total: number }> {
    const wallet = await this.getOrCreateWallet(studentId);

    const [transactions, total] = await this.transactionRepository.findAndCount({
      where: { walletId: wallet.id },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { transactions, total };
  }
}
```

### 2. Wallet Controller

Create a `WalletController` to handle wallet API endpoints:

```typescript
// wallet.controller.ts
import { Controller, Post, Get, Body, UseGuards, Request, Query, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WalletService } from './wallet.service';
import { FundWalletDto } from './dto/fund-wallet.dto';

@Controller('portal/student/wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  /**
   * GET /portal/student/wallet/balance
   * Get current wallet balance
   */
  @Get('balance')
  async getBalance(@Request() req) {
    const balance = await this.walletService.getWalletBalance(req.user.id);
    return { balance };
  }

  /**
   * POST /portal/student/wallet/fund
   * Initialize wallet funding via Paystack
   */
  @Post('fund')
  async fundWallet(@Request() req, @Body() fundWalletDto: FundWalletDto) {
    // Get student details
    const student = await this.getStudentDetails(req.user.id);
    
    return await this.walletService.initializeWalletFunding(
      req.user.id,
      fundWalletDto.amount,
      student.email,
      student.fullName,
    );
  }

  /**
   * GET /portal/student/wallet/transactions
   * Get wallet transaction history
   */
  @Get('transactions')
  async getTransactions(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return await this.walletService.getTransactionHistory(req.user.id, page, limit);
  }

  /**
   * POST /portal/student/wallet/verify
   * Verify wallet funding (called by Paystack webhook or frontend callback)
   */
  @Post('verify')
  async verifyFunding(@Body('reference') reference: string) {
    return await this.walletService.verifyWalletFunding(reference);
  }
}
```

### 3. Fund Wallet DTO

```typescript
// dto/fund-wallet.dto.ts
import { IsNumber, Min } from 'class-validator';

export class FundWalletDto {
  @IsNumber()
  @Min(100, { message: 'Minimum funding amount is ₦100' })
  amount: number;
}
```

---

## Installment Payment Implementation

### 1. Payment Service Updates

Update your `PaymentService` to handle installment payments:

```typescript
// payment.service.ts (add these methods)

/**
 * Pay installment using wallet or Paystack
 */
async payInstallment(
  studentId: string,
  installmentId: string,
  paymentSource: 'wallet' | 'paystack',
): Promise<{ success: boolean; message?: string; authorizationUrl?: string; reference?: string }> {
  // Get installment details
  const installment = await this.paymentScheduleRepository.findOne({
    where: { id: installmentId },
    relations: ['paymentPlan', 'paymentPlan.student'],
  });

  if (!installment) {
    throw new NotFoundException('Installment not found');
  }

  // Verify student owns this installment
  if (installment.paymentPlan.student.id !== studentId) {
    throw new ForbiddenException('You do not have permission to pay this installment');
  }

  // Check if installment can be paid
  if (!installment.canPay || installment.status === 'PAID') {
    throw new BadRequestException('This installment cannot be paid at this time');
  }

  if (paymentSource === 'wallet') {
    // Pay from wallet
    const walletService = this.moduleRef.get(WalletService);
    const walletBalance = await walletService.getWalletBalance(studentId);

    if (walletBalance < Number(installment.amount)) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    // Deduct from wallet
    const walletTransaction = await walletService.deductFromWallet(
      studentId,
      Number(installment.amount),
      `Payment for installment ${installment.installmentNumber} of ${installment.totalInstallments}`,
    );

    // Create payment record
    const payment = await this.paymentRepository.save({
      studentId,
      amount: Number(installment.amount),
      paymentMethod: 'wallet',
      walletTransactionId: walletTransaction.id,
      paymentPlanId: installment.paymentPlanId,
      status: 'APPROVED',
      reference: walletTransaction.reference || walletTransaction.id,
    });

    // Update installment status
    installment.status = 'PAID';
    await this.paymentScheduleRepository.save(installment);

    return {
      success: true,
      message: 'Payment successful',
      reference: payment.reference,
    };
  } else {
    // Pay via Paystack
    const student = await this.studentRepository.findOne({
      where: { id: studentId },
    });

    // Initialize Paystack payment
    const paystackResponse = await this.paystackService.initializeTransaction({
      email: student.email,
      amount: Number(installment.amount) * 100, // Convert to kobo
      reference: `INST_${installment.id}_${Date.now()}`,
      metadata: {
        studentId,
        installmentId: installment.id,
        paymentPlanId: installment.paymentPlanId,
        type: 'installment_payment',
      },
      callback_url: `${process.env.FRONTEND_URL}/payments?success=true&reference=${installment.id}`,
    });

    // Create pending payment record
    await this.paymentRepository.save({
      studentId,
      amount: Number(installment.amount),
      paymentMethod: 'paystack',
      paystackReference: paystackResponse.reference,
      paymentPlanId: installment.paymentPlanId,
      status: 'PENDING',
      reference: paystackResponse.reference,
    });

    return {
      success: true,
      authorizationUrl: paystackResponse.authorization_url,
      accessCode: paystackResponse.access_code,
      reference: paystackResponse.reference,
    };
  }
}

/**
 * Verify and complete installment payment after Paystack callback
 */
async verifyInstallmentPayment(reference: string): Promise<Payment> {
  // Find payment by Paystack reference
  const payment = await this.paymentRepository.findOne({
    where: { paystackReference: reference },
    relations: ['paymentPlan'],
  });

  if (!payment) {
    throw new NotFoundException('Payment not found');
  }

  if (payment.status === 'APPROVED') {
    return payment; // Already processed
  }

  // Verify with Paystack
  const verification = await this.paystackService.verifyTransaction(reference);

  if (verification.status === 'success' && verification.amount >= payment.amount * 100) {
    // Payment successful
    payment.status = 'APPROVED';
    await this.paymentRepository.save(payment);

    // Update installment status
    const installment = await this.paymentScheduleRepository.findOne({
      where: {
        paymentPlanId: payment.paymentPlanId,
        installmentNumber: payment.installmentNumber || 1,
      },
    });

    if (installment) {
      installment.status = 'PAID';
      await this.paymentScheduleRepository.save(installment);
    }

    return payment;
  } else {
    // Payment failed
    payment.status = 'REJECTED';
    await this.paymentRepository.save(payment);
    throw new BadRequestException('Payment verification failed');
  }
}
```

### 2. Payment Controller Updates

Add endpoint to handle installment payments:

```typescript
// payment.controller.ts (add this endpoint)

/**
 * POST /portal/student/payments/pay-installment
 * Pay an installment using wallet or Paystack
 */
@Post('pay-installment')
@UseGuards(JwtAuthGuard)
async payInstallment(
  @Request() req,
  @Body() payInstallmentDto: PayInstallmentDto,
) {
  return await this.paymentService.payInstallment(
    req.user.id,
    payInstallmentDto.installmentId,
    payInstallmentDto.paymentSource,
  );
}

/**
 * POST /portal/student/payments/verify
 * Verify installment payment (called by Paystack webhook or frontend callback)
 */
@Post('verify')
async verifyPayment(@Body('reference') reference: string) {
  return await this.paymentService.verifyInstallmentPayment(reference);
}
```

### 3. Pay Installment DTO

```typescript
// dto/pay-installment.dto.ts
import { IsString, IsEnum } from 'class-validator';

export class PayInstallmentDto {
  @IsString()
  installmentId: string;

  @IsEnum(['wallet', 'paystack'])
  paymentSource: 'wallet' | 'paystack';
}
```

---

## Paystack Integration

### 1. Paystack Service

Create a `PaystackService` to handle Paystack API calls:

```typescript
// paystack.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class PaystackService {
  private readonly secretKey: string;
  private readonly publicKey: string;
  private readonly baseUrl = 'https://api.paystack.co';

  constructor() {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY;
    this.publicKey = process.env.PAYSTACK_PUBLIC_KEY;

    if (!this.secretKey || !this.publicKey) {
      throw new Error('Paystack keys are not configured');
    }
  }

  /**
   * Initialize a transaction
   */
  async initializeTransaction(data: {
    email: string;
    amount: number;
    reference: string;
    metadata?: any;
    callback_url?: string;
  }): Promise<{
    authorization_url: string;
    access_code: string;
    reference: string;
  }> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/transaction/initialize`,
        {
          email: data.email,
          amount: data.amount,
          reference: data.reference,
          metadata: data.metadata,
          callback_url: data.callback_url,
        },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.data.status) {
        return {
          authorization_url: response.data.data.authorization_url,
          access_code: response.data.data.access_code,
          reference: response.data.data.reference,
        };
      }

      throw new BadRequestException('Failed to initialize Paystack transaction');
    } catch (error) {
      console.error('Paystack initialization error:', error.response?.data || error.message);
      throw new BadRequestException('Failed to initialize payment');
    }
  }

  /**
   * Verify a transaction
   */
  async verifyTransaction(reference: string): Promise<{
    status: string;
    amount: number;
    customer: any;
    metadata: any;
  }> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        },
      );

      if (response.data.status) {
        return {
          status: response.data.data.status,
          amount: response.data.data.amount,
          customer: response.data.data.customer,
          metadata: response.data.data.metadata,
        };
      }

      throw new BadRequestException('Transaction verification failed');
    } catch (error) {
      console.error('Paystack verification error:', error.response?.data || error.message);
      throw new BadRequestException('Failed to verify transaction');
    }
  }
}
```

### 2. Paystack Webhook Handler

Create a webhook handler to process Paystack callbacks:

```typescript
// paystack-webhook.controller.ts
import { Controller, Post, Body, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { PaystackService } from './paystack.service';
import { WalletService } from './wallet.service';
import { PaymentService } from './payment.service';
import crypto from 'crypto';

@Controller('webhooks/paystack')
export class PaystackWebhookController {
  constructor(
    private paystackService: PaystackService,
    private walletService: WalletService,
    private paymentService: PaymentService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() body: any,
    @Headers('x-paystack-signature') signature: string,
  ) {
    // Verify webhook signature
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(body))
      .digest('hex');

    if (hash !== signature) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const { event, data } = body;

    if (event === 'charge.success') {
      const reference = data.reference;
      const metadata = data.metadata;

      if (metadata?.type === 'wallet_funding') {
        // Handle wallet funding
        await this.walletService.verifyWalletFunding(reference);
      } else if (metadata?.type === 'installment_payment') {
        // Handle installment payment
        await this.paymentService.verifyInstallmentPayment(reference);
      }
    }

    return { received: true };
  }
}
```

---

## API Endpoints Summary

### Wallet Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/portal/student/wallet/balance` | Get wallet balance | Yes |
| POST | `/portal/student/wallet/fund` | Initialize wallet funding | Yes |
| GET | `/portal/student/wallet/transactions` | Get transaction history | Yes |
| POST | `/portal/student/wallet/verify` | Verify wallet funding | Yes |

### Payment Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/portal/student/payments/pay-installment` | Pay installment | Yes |
| POST | `/portal/student/payments/verify` | Verify payment | No (webhook) |

### Webhook Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/webhooks/paystack` | Paystack webhook handler | No (signature verification) |

---

## Error Handling

### Common Error Responses

```typescript
// 400 Bad Request
{
  "statusCode": 400,
  "message": "Insufficient wallet balance",
  "error": "Bad Request"
}

// 404 Not Found
{
  "statusCode": 404,
  "message": "Installment not found",
  "error": "Not Found"
}

// 403 Forbidden
{
  "statusCode": 403,
  "message": "You do not have permission to pay this installment",
  "error": "Forbidden"
}
```

---

## Environment Variables

Add these to your `.env` file:

```env
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxx
PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxx
FRONTEND_URL=http://localhost:3000
```

---

## Testing

### 1. Test Wallet Funding

```bash
# Initialize wallet funding
POST /portal/student/wallet/fund
{
  "amount": 5000
}

# Response
{
  "authorizationUrl": "https://checkout.paystack.com/...",
  "accessCode": "...",
  "reference": "..."
}

# After payment, verify
POST /portal/student/wallet/verify
{
  "reference": "..."
}
```

### 2. Test Installment Payment

```bash
# Pay from wallet
POST /portal/student/payments/pay-installment
{
  "installmentId": "installment-uuid",
  "paymentSource": "wallet"
}

# Pay via Paystack
POST /portal/student/payments/pay-installment
{
  "installmentId": "installment-uuid",
  "paymentSource": "paystack"
}
```

---

## Important Notes

1. **Transaction Atomicity**: Ensure wallet deductions and payment creation happen in a transaction to prevent inconsistencies.

2. **Webhook Security**: Always verify Paystack webhook signatures to prevent unauthorized requests.

3. **Idempotency**: Handle duplicate webhook calls gracefully - check if payment is already processed before processing again.

4. **Error Recovery**: Implement retry logic for failed Paystack API calls.

5. **Balance Checks**: Always verify wallet balance before deducting to prevent negative balances.

6. **Payment Status**: Keep payment status in sync with installment status.

7. **Reference Management**: Use unique references for all transactions to avoid conflicts.

---

## Next Steps

1. Create database migrations for wallet and wallet_transaction tables
2. Register WalletService and PaystackService in your module
3. Add proper validation and error handling
4. Implement logging for all wallet and payment operations
5. Set up monitoring and alerts for failed transactions
6. Add unit and integration tests

---

## Support

For questions or issues, please refer to:
- Paystack API Documentation: https://paystack.com/docs/api
- TypeORM Documentation: https://typeorm.io/
- NestJS Documentation: https://docs.nestjs.com/

