# Save and Exit - Leads Backend Implementation Guide

This guide provides the complete backend implementation for saving partial onboarding data to the leads table when users click "Save and Exit" during the onboarding process.

## Overview

When a user clicks "Save and Exit" during onboarding, their partial information should be saved to the `leads` table for follow-up purposes. Unlike full enrollment, leads can have many optional fields since the user hasn't completed the entire onboarding process.

---

## Request Payload Structure

### Save and Exit Request Payload

```json
{
  "userId": "user_123abc",
  "profile": {
    "trainingLocation": "clx123abc",
    "centre": "clx789ghi",
    "studentAddress": "123 Main Street, Wuse 2, Abuja, FCT",
    "guardianName": "John Doe",
    "guardianPhone": "08012345678",
    "guardianEmail": "guardian@example.com",
    "guardianAddress": "456 Guardian Street, Garki, Abuja, FCT",
    "hasGuardian": true
  },
  "selectedCenter": {
    "id": "clx789ghi",
    "name": "Abuja Center"
  },
  "selectedCourse": {
    "id": "clx111aaa",
    "name": "Digital Marketing Course"
  },
  "step": 1,
  "source": "onboarding_save_and_exit"
}
```

### Minimal Payload (User only filled basic info)

```json
{
  "userId": "user_123abc",
  "profile": {
    "trainingLocation": "clx123abc",
    "hasGuardian": false
  },
  "step": 1,
  "source": "onboarding_save_and_exit"
}
```

---

## Database Schema

### Leads Table Structure

The `leads` table should have the following structure to accommodate partial onboarding data:

```sql
CREATE TABLE leads (
  id VARCHAR PRIMARY KEY,
  userId VARCHAR NOT NULL, -- Foreign key to users table
  
  -- Basic Information (from User account)
  fullName VARCHAR NOT NULL,
  email VARCHAR NOT NULL,
  phone VARCHAR,
  
  -- Location Information (Optional - from Step 1)
  trainingLocation VARCHAR, -- Location/State ID
  trainingLocationName VARCHAR, -- Location/State name (for display)
  centerId VARCHAR, -- Center ID (nullable)
  centerName VARCHAR, -- Center name (for display)
  studentAddress VARCHAR(500), -- Student's residential address
  
  -- Course Information (Optional - from Step 2)
  courseId VARCHAR, -- Course ID (nullable)
  courseName VARCHAR, -- Course name (for display)
  
  -- Guardian Information (Optional - from Step 1)
  hasGuardian BOOLEAN DEFAULT false,
  guardianName VARCHAR,
  guardianPhone VARCHAR,
  guardianEmail VARCHAR,
  guardianAddress VARCHAR(500),
  
  -- Progress Tracking
  onboardingStep INTEGER DEFAULT 1, -- Which step they were on (1, 2, or 3)
  lastSavedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Lead Status
  status VARCHAR DEFAULT 'PENDING', -- PENDING, CONTACTED, CONVERTED, LOST
  source VARCHAR DEFAULT 'onboarding_save_and_exit', -- Source of the lead
  
  -- Notes and Follow-up
  notes TEXT, -- Internal notes for follow-up
  contactedAt TIMESTAMP,
  contactedBy VARCHAR, -- User ID who contacted
  convertedAt TIMESTAMP, -- When lead converted to student
  convertedToStudentId VARCHAR, -- Student ID if converted
  
  -- Timestamps
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (centerId) REFERENCES centers(id),
  FOREIGN KEY (courseId) REFERENCES courses(id),
  FOREIGN KEY (convertedToStudentId) REFERENCES students(id)
);

-- Indexes for performance
CREATE INDEX idx_leads_userId ON leads(userId);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_centerId ON leads(centerId);
CREATE INDEX idx_leads_createdAt ON leads(createdAt);
```

---

## Backend Implementation Steps

### Step 1: Create Lead Entity

**File:** `entities/lead.entity.ts`

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Center } from './center.entity';
import { Course } from './course.entity';
import { Student } from './student.entity';

export enum LeadStatus {
  PENDING = 'PENDING',
  CONTACTED = 'CONTACTED',
  CONVERTED = 'CONVERTED',
  LOST = 'LOST',
}

@Entity('leads')
export class Lead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // User relationship
  @Column({ nullable: false })
  @Index()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  // Basic Information (from User)
  @Column()
  fullName: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  phone: string;

  // Location Information (Optional)
  @Column({ nullable: true })
  trainingLocation: string;

  @Column({ nullable: true })
  trainingLocationName: string;

  @Column({ nullable: true })
  @Index()
  centerId: string;

  @ManyToOne(() => Center)
  @JoinColumn({ name: 'centerId' })
  center: Center;

  @Column({ nullable: true })
  centerName: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  studentAddress: string;

  // Course Information (Optional)
  @Column({ nullable: true })
  courseId: string;

  @ManyToOne(() => Course)
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Column({ nullable: true })
  courseName: string;

  // Guardian Information (Optional)
  @Column({ default: false })
  hasGuardian: boolean;

  @Column({ nullable: true })
  guardianName: string;

  @Column({ nullable: true })
  guardianPhone: string;

  @Column({ nullable: true })
  guardianEmail: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  guardianAddress: string;

  // Progress Tracking
  @Column({ default: 1 })
  onboardingStep: number; // 1, 2, or 3

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastSavedAt: Date;

  // Lead Status
  @Column({
    type: 'enum',
    enum: LeadStatus,
    default: LeadStatus.PENDING,
  })
  @Index()
  status: LeadStatus;

  @Column({ default: 'onboarding_save_and_exit' })
  source: string;

  // Notes and Follow-up
  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'timestamp', nullable: true })
  contactedAt: Date;

  @Column({ nullable: true })
  contactedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  convertedAt: Date;

  @Column({ nullable: true })
  convertedToStudentId: string;

  @ManyToOne(() => Student)
  @JoinColumn({ name: 'convertedToStudentId' })
  convertedToStudent: Student;

  // Timestamps
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

---

### Step 2: Create DTO (Data Transfer Object)

**File:** `dto/create-lead.dto.ts`

```typescript
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsObject,
  ValidateIf,
  IsNotEmpty,
  IsEmail,
} from 'class-validator';

export class CreateLeadDto {
  @IsString()
  @IsOptional()
  userId?: string;

  profile: {
    @IsString()
    @IsOptional()
    trainingLocation?: string;

    @IsString()
    @IsOptional()
    centre?: string;

    @IsString()
    @IsOptional()
    studentAddress?: string;

    @IsString()
    @ValidateIf((o) => o.hasGuardian === true)
    @IsNotEmpty()
    guardianName?: string;

    @IsString()
    @IsOptional()
    guardianPhone?: string;

    @IsString()
    @IsEmail()
    @IsOptional()
    guardianEmail?: string;

    @IsString()
    @ValidateIf((o) => o.hasGuardian === true)
    @IsNotEmpty()
    guardianAddress?: string;

    @IsBoolean()
    @IsOptional()
    hasGuardian?: boolean;
  };

  @IsObject()
  @IsOptional()
  selectedCenter?: {
    id: string;
    name: string;
  };

  @IsObject()
  @IsOptional()
  selectedCourse?: {
    id: string;
    name: string;
  };

  @IsNumber()
  @IsOptional()
  step?: number;

  @IsString()
  @IsOptional()
  source?: string;
}
```

---

### Step 3: Create Lead Service

**File:** `leads.service.ts`

```typescript
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead, LeadStatus } from './entities/lead.entity';
import { User } from './entities/user.entity';
import { Center } from './entities/center.entity';
import { Course } from './entities/course.entity';
import { CreateLeadDto } from './dto/create-lead.dto';

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead)
    private leadRepository: Repository<Lead>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Center)
    private centerRepository: Repository<Center>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
  ) {}

  /**
   * Create or update a lead from onboarding save and exit
   */
  async createOrUpdateLeadFromOnboarding(
    dto: CreateLeadDto,
    userId: string,
  ): Promise<Lead> {
    // 1. Get user information
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 2. Check if lead already exists for this user
    let lead = await this.leadRepository.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    // 3. Get location/center/course names if IDs are provided
    let trainingLocationName: string | null = null;
    let centerName: string | null = null;
    let courseName: string | null = null;

    if (dto.profile?.trainingLocation) {
      // You may need to fetch from locations table
      // For now, we'll store the ID and fetch name separately if needed
      trainingLocationName = dto.profile.trainingLocation;
    }

    if (dto.selectedCenter?.id) {
      const center = await this.centerRepository.findOne({
        where: { id: dto.selectedCenter.id },
      });
      if (center) {
        centerName = center.name;
      }
    } else if (dto.selectedCenter?.name) {
      centerName = dto.selectedCenter.name;
    }

    if (dto.selectedCourse?.id) {
      const course = await this.courseRepository.findOne({
        where: { id: dto.selectedCourse.id },
      });
      if (course) {
        courseName = course.name;
      }
    } else if (dto.selectedCourse?.name) {
      courseName = dto.selectedCourse.name;
    }

    // 4. Create or update lead
    if (lead) {
      // Update existing lead
      lead.fullName = user.fullName;
      lead.email = user.email;
      lead.phone = user.phone || lead.phone;

      // Update location info if provided
      if (dto.profile?.trainingLocation) {
        lead.trainingLocation = dto.profile.trainingLocation;
        lead.trainingLocationName = trainingLocationName;
      }

      if (dto.selectedCenter?.id) {
        lead.centerId = dto.selectedCenter.id;
        lead.centerName = centerName || dto.selectedCenter.name;
      }

      if (dto.profile?.studentAddress) {
        lead.studentAddress = dto.profile.studentAddress;
      }

      // Update course info if provided
      if (dto.selectedCourse?.id) {
        lead.courseId = dto.selectedCourse.id;
        lead.courseName = courseName || dto.selectedCourse.name;
      }

      // Update guardian info if provided
      if (dto.profile?.hasGuardian !== undefined) {
        lead.hasGuardian = dto.profile.hasGuardian;
      }

      if (dto.profile?.guardianName) {
        lead.guardianName = dto.profile.guardianName;
      }

      if (dto.profile?.guardianPhone) {
        lead.guardianPhone = dto.profile.guardianPhone;
      }

      if (dto.profile?.guardianEmail) {
        lead.guardianEmail = dto.profile.guardianEmail;
      }

      if (dto.profile?.guardianAddress) {
        lead.guardianAddress = dto.profile.guardianAddress;
      }

      // Update progress
      if (dto.step) {
        lead.onboardingStep = dto.step;
      }

      lead.lastSavedAt = new Date();
      lead.source = dto.source || 'onboarding_save_and_exit';

      // Don't change status if it's already CONTACTED or CONVERTED
      if (lead.status === LeadStatus.PENDING || lead.status === LeadStatus.LOST) {
        lead.status = LeadStatus.PENDING;
      }

      return await this.leadRepository.save(lead);
    } else {
      // Create new lead
      lead = this.leadRepository.create({
        userId: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone || null,
        trainingLocation: dto.profile?.trainingLocation || null,
        trainingLocationName: trainingLocationName,
        centerId: dto.selectedCenter?.id || null,
        centerName: centerName || dto.selectedCenter?.name || null,
        studentAddress: dto.profile?.studentAddress || null,
        courseId: dto.selectedCourse?.id || null,
        courseName: courseName || dto.selectedCourse?.name || null,
        hasGuardian: dto.profile?.hasGuardian || false,
        guardianName: dto.profile?.guardianName || null,
        guardianPhone: dto.profile?.guardianPhone || null,
        guardianEmail: dto.profile?.guardianEmail || null,
        guardianAddress: dto.profile?.guardianAddress || null,
        onboardingStep: dto.step || 1,
        lastSavedAt: new Date(),
        status: LeadStatus.PENDING,
        source: dto.source || 'onboarding_save_and_exit',
      });

      return await this.leadRepository.save(lead);
    }
  }

  /**
   * Get all leads (with pagination)
   */
  async findAll(
    page: number = 1,
    limit: number = 10,
    status?: LeadStatus,
    centerId?: string,
  ): Promise<{ leads: Lead[]; total: number; page: number; limit: number }> {
    const queryBuilder = this.leadRepository.createQueryBuilder('lead');

    if (status) {
      queryBuilder.where('lead.status = :status', { status });
    }

    if (centerId) {
      queryBuilder.andWhere('lead.centerId = :centerId', { centerId });
    }

    const [leads, total] = await queryBuilder
      .orderBy('lead.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      leads,
      total,
      page,
      limit,
    };
  }

  /**
   * Get lead by ID
   */
  async findOne(id: string): Promise<Lead> {
    const lead = await this.leadRepository.findOne({
      where: { id },
      relations: ['user', 'center', 'course'],
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    return lead;
  }

  /**
   * Get lead by user ID
   */
  async findByUserId(userId: string): Promise<Lead | null> {
    return await this.leadRepository.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
      relations: ['center', 'course'],
    });
  }

  /**
   * Update lead status
   */
  async updateStatus(
    id: string,
    status: LeadStatus,
    contactedBy?: string,
  ): Promise<Lead> {
    const lead = await this.findOne(id);

    lead.status = status;

    if (status === LeadStatus.CONTACTED && !lead.contactedAt) {
      lead.contactedAt = new Date();
      if (contactedBy) {
        lead.contactedBy = contactedBy;
      }
    }

    return await this.leadRepository.save(lead);
  }

  /**
   * Mark lead as converted to student
   */
  async markAsConverted(
    leadId: string,
    studentId: string,
  ): Promise<Lead> {
    const lead = await this.findOne(leadId);

    lead.status = LeadStatus.CONVERTED;
    lead.convertedAt = new Date();
    lead.convertedToStudentId = studentId;

    return await this.leadRepository.save(lead);
  }
}
```

---

### Step 4: Create Lead Controller

**File:** `leads.controller.ts`

```typescript
import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { LeadStatus } from './entities/lead.entity';

@Controller('leads')
@UseGuards(JwtAuthGuard)
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  /**
   * Save onboarding data as lead (Save and Exit)
   * POST /leads/save-from-onboarding
   */
  @Post('save-from-onboarding')
  async saveFromOnboarding(
    @Body() createLeadDto: CreateLeadDto,
    @Request() req: any,
  ) {
    const userId = req.user.id; // Extract from JWT token

    const lead = await this.leadsService.createOrUpdateLeadFromOnboarding(
      createLeadDto,
      userId,
    );

    return {
      success: true,
      message: 'Lead saved successfully',
      data: lead,
    };
  }

  /**
   * Get all leads (with pagination and filters)
   * GET /leads?page=1&limit=10&status=PENDING&centerId=xxx
   */
  @Get()
  async findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
    @Query('status') status?: LeadStatus,
    @Query('centerId') centerId?: string,
  ) {
    const result = await this.leadsService.findAll(page, limit, status, centerId);

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Get lead by ID
   * GET /leads/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const lead = await this.leadsService.findOne(id);

    return {
      success: true,
      data: lead,
    };
  }

  /**
   * Get lead by user ID
   * GET /leads/user/:userId
   */
  @Get('user/:userId')
  async findByUserId(@Param('userId') userId: string) {
    const lead = await this.leadsService.findByUserId(userId);

    return {
      success: true,
      data: lead,
    };
  }

  /**
   * Update lead status
   * PUT /leads/:id/status
   */
  @Put(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: LeadStatus; contactedBy?: string },
    @Request() req: any,
  ) {
    const lead = await this.leadsService.updateStatus(
      id,
      body.status,
      body.contactedBy || req.user.id,
    );

    return {
      success: true,
      message: 'Lead status updated successfully',
      data: lead,
    };
  }

  /**
   * Mark lead as converted
   * PUT /leads/:id/convert
   */
  @Put(':id/convert')
  async markAsConverted(
    @Param('id') id: string,
    @Body() body: { studentId: string },
  ) {
    const lead = await this.leadsService.markAsConverted(id, body.studentId);

    return {
      success: true,
      message: 'Lead marked as converted',
      data: lead,
    };
  }
}
```

---

### Step 5: Update Module

**File:** `leads.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { Lead } from './entities/lead.entity';
import { User } from './entities/user.entity';
import { Center } from './entities/center.entity';
import { Course } from './entities/course.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Lead, User, Center, Course]),
  ],
  controllers: [LeadsController],
  providers: [LeadsService],
  exports: [LeadsService],
})
export class LeadsModule {}
```

---

### Step 6: Create Database Migration

**File:** `migrations/XXXXXX-create-leads-table.ts`

```typescript
import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateLeadsTable1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'leads',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'fullName',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'email',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'phone',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'trainingLocation',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'trainingLocationName',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'centerId',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'centerName',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'studentAddress',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'courseId',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'courseName',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'hasGuardian',
            type: 'boolean',
            default: false,
          },
          {
            name: 'guardianName',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'guardianPhone',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'guardianEmail',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'guardianAddress',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'onboardingStep',
            type: 'int',
            default: 1,
          },
          {
            name: 'lastSavedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'status',
            type: 'varchar',
            default: "'PENDING'",
          },
          {
            name: 'source',
            type: 'varchar',
            default: "'onboarding_save_and_exit'",
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'contactedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'contactedBy',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'convertedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'convertedToStudentId',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'leads',
      new TableIndex({
        name: 'idx_leads_userId',
        columnNames: ['userId'],
      }),
    );

    await queryRunner.createIndex(
      'leads',
      new TableIndex({
        name: 'idx_leads_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'leads',
      new TableIndex({
        name: 'idx_leads_centerId',
        columnNames: ['centerId'],
      }),
    );

    await queryRunner.createIndex(
      'leads',
      new TableIndex({
        name: 'idx_leads_createdAt',
        columnNames: ['createdAt'],
      }),
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'leads',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'leads',
      new TableForeignKey({
        columnNames: ['centerId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'centers',
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'leads',
      new TableForeignKey({
        columnNames: ['courseId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'courses',
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'leads',
      new TableForeignKey({
        columnNames: ['convertedToStudentId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'students',
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('leads');
  }
}
```

---

## Field Requirements Summary

### Required Fields (Always)
- `userId` - User ID from JWT token
- `fullName` - From user account
- `email` - From user account
- `status` - Default: 'PENDING'
- `source` - Default: 'onboarding_save_and_exit'
- `onboardingStep` - Default: 1

### Optional Fields (Can be null/empty)
- `phone` - From user account (if available)
- `trainingLocation` - From Step 1 profile
- `trainingLocationName` - For display
- `centerId` - From Step 1 profile
- `centerName` - For display
- `studentAddress` - From Step 1 profile
- `courseId` - From Step 2 selection
- `courseName` - For display
- `hasGuardian` - From Step 1 profile (default: false)
- `guardianName` - From Step 1 profile (required only if hasGuardian is true)
- `guardianPhone` - From Step 1 profile
- `guardianEmail` - From Step 1 profile
- `guardianAddress` - From Step 1 profile (required only if hasGuardian is true)

---

## Validation Rules

### Lead Creation/Update
1. **User must exist**: The `userId` must reference a valid user
2. **Guardian fields**: If `hasGuardian` is `true`, then `guardianName` and `guardianAddress` should be provided (but not strictly required for leads)
3. **Step validation**: `onboardingStep` should be 1, 2, or 3
4. **Status validation**: Status must be one of: `PENDING`, `CONTACTED`, `CONVERTED`, `LOST`

### Conditional Validation
- If `centerId` is provided, it should exist in the `centers` table
- If `courseId` is provided, it should exist in the `courses` table
- If `guardianEmail` is provided, it should be a valid email format

---

## API Endpoints

### 1. Save Lead from Onboarding
**POST** `/leads/save-from-onboarding`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "profile": {
    "trainingLocation": "clx123abc",
    "centre": "clx789ghi",
    "studentAddress": "123 Main Street",
    "hasGuardian": true,
    "guardianName": "John Doe",
    "guardianPhone": "08012345678",
    "guardianEmail": "guardian@example.com",
    "guardianAddress": "456 Guardian Street"
  },
  "selectedCenter": {
    "id": "clx789ghi",
    "name": "Abuja Center"
  },
  "selectedCourse": {
    "id": "clx111aaa",
    "name": "Digital Marketing"
  },
  "step": 1
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Lead saved successfully",
  "data": {
    "id": "lead_123abc",
    "userId": "user_123abc",
    "fullName": "Mercy Isaiah",
    "email": "mercy@example.com",
    "phone": "08012345678",
    "trainingLocation": "clx123abc",
    "centerId": "clx789ghi",
    "centerName": "Abuja Center",
    "studentAddress": "123 Main Street",
    "courseId": null,
    "hasGuardian": true,
    "guardianName": "John Doe",
    "onboardingStep": 1,
    "status": "PENDING",
    "source": "onboarding_save_and_exit",
    "createdAt": "2026-01-02T10:16:00Z",
    "updatedAt": "2026-01-02T10:16:00Z"
  }
}
```

### 2. Get All Leads
**GET** `/leads?page=1&limit=10&status=PENDING&centerId=xxx`

**Response:**
```json
{
  "success": true,
  "data": {
    "leads": [...],
    "total": 50,
    "page": 1,
    "limit": 10
  }
}
```

### 3. Get Lead by ID
**GET** `/leads/:id`

### 4. Get Lead by User ID
**GET** `/leads/user/:userId`

### 5. Update Lead Status
**PUT** `/leads/:id/status`

**Request Body:**
```json
{
  "status": "CONTACTED",
  "contactedBy": "staff_user_id"
}
```

### 6. Mark Lead as Converted
**PUT** `/leads/:id/convert`

**Request Body:**
```json
{
  "studentId": "student_123abc"
}
```

---

## Frontend Integration

### Update Save and Exit Handler

**File:** `src/app/onboarding/page.tsx`

Update the `handleSaveAndExit` function:

```typescript
const handleSaveAndExit = async () => {
  try {
    // Prepare payload
    const payload = {
      profile: {
        trainingLocation: formData.profile?.trainingLocation || null,
        centre: formData.profile?.centre || formData.selectedCenter?.id || null,
        studentAddress: formData.profile?.studentAddress || null,
        hasGuardian: formData.profile?.hasGuardian || false,
        guardianName: formData.profile?.guardianName || null,
        guardianPhone: formData.profile?.guardianPhone || null,
        guardianEmail: formData.profile?.guardianEmail || null,
        guardianAddress: formData.profile?.guardianAddress || null,
      },
      selectedCenter: formData.selectedCenter ? {
        id: formData.selectedCenter.id,
        name: formData.selectedCenter.name,
      } : null,
      selectedCourse: formData.selectedCourse ? {
        id: formData.selectedCourse.id,
        name: formData.selectedCourse.name,
      } : null,
      step: step,
      source: 'onboarding_save_and_exit',
    };

    // Save to backend
    const response = await fetch('/api/onboarding/save-lead', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error('Failed to save lead');
    }

    // Also save to localStorage for frontend restoration
    if (typeof window !== "undefined") {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          step,
          profile: formData.profile,
          selectedCourse: formData.selectedCourse,
          paymentPlan: formData.paymentPlan,
        })
      );
    }

    // Redirect to dashboard
    window.location.href = "/dashboard";
  } catch (error) {
    console.error('Error saving lead:', error);
    // Still redirect even if save fails (graceful degradation)
    window.location.href = "/dashboard";
  }
};
```

### Create Frontend API Route

**File:** `src/app/api/onboarding/save-lead/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserIdFromToken } from '@/lib/utils/jwt';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Extract user ID from JWT token
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;
    const userId = token ? getUserIdFromToken(token) : null;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Prepare payload for backend
    const payload = {
      ...body,
      userId, // Add userId from token
    };

    // Submit to backend API
    const apiBaseUrl = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!apiBaseUrl) {
      return NextResponse.json(
        { error: 'API server not configured' },
        { status: 500 }
      );
    }

    const response = await fetch(`${apiBaseUrl}/leads/save-from-onboarding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to save lead' }));
      return NextResponse.json(
        { error: error.message || 'Failed to save lead' },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      data: data,
    });
  } catch (error: any) {
    console.error('Save lead error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save lead' },
      { status: 500 }
    );
  }
}
```

---

## Testing

### Test Cases

1. **Save lead with minimal data (Step 1, no guardian)**
   ```json
   {
     "profile": {
       "trainingLocation": "clx123abc",
       "hasGuardian": false
     },
     "step": 1
   }
   ```

2. **Save lead with location and center (Step 1 complete)**
   ```json
   {
     "profile": {
       "trainingLocation": "clx123abc",
       "centre": "clx789ghi",
       "studentAddress": "123 Main Street",
       "hasGuardian": true,
       "guardianName": "John Doe",
       "guardianPhone": "08012345678",
       "guardianAddress": "456 Guardian Street"
     },
     "selectedCenter": {
       "id": "clx789ghi",
       "name": "Abuja Center"
     },
     "step": 1
   }
   ```

3. **Save lead with course selection (Step 2)**
   ```json
   {
     "profile": {
       "trainingLocation": "clx123abc",
       "centre": "clx789ghi",
       "studentAddress": "123 Main Street",
       "hasGuardian": false
     },
     "selectedCenter": {
       "id": "clx789ghi",
       "name": "Abuja Center"
     },
     "selectedCourse": {
       "id": "clx111aaa",
       "name": "Digital Marketing"
     },
     "step": 2
   }
   ```

4. **Update existing lead**
   - Call the same endpoint again with more data
   - Should update the existing lead, not create a new one

5. **Test validation**
   - Missing userId → Should return 401 Unauthorized
   - Invalid centerId → Should handle gracefully (set to null or return error)
   - Invalid courseId → Should handle gracefully (set to null or return error)

---

## Summary Checklist

- [ ] Create `Lead` entity with all required and optional fields
- [ ] Create `CreateLeadDto` with proper validation
- [ ] Implement `LeadsService` with `createOrUpdateLeadFromOnboarding` method
- [ ] Create `LeadsController` with save endpoint
- [ ] Update `LeadsModule` to include all dependencies
- [ ] Create database migration for `leads` table
- [ ] Run migration
- [ ] Update frontend `handleSaveAndExit` to call backend API
- [ ] Create frontend API route `/api/onboarding/save-lead`
- [ ] Test with minimal data
- [ ] Test with complete Step 1 data
- [ ] Test with Step 2 data (course selected)
- [ ] Test updating existing lead
- [ ] Verify leads appear in admin dashboard
- [ ] Test lead status updates
- [ ] Test lead conversion to student

---

## Important Notes

1. **Lead vs Student**: Leads are for follow-up purposes. When a lead completes onboarding and makes payment, they should be converted to a student. The `markAsConverted` method handles this.

2. **Upsert Logic**: The service uses upsert logic - if a lead exists for the user, it updates it; otherwise, it creates a new one. This prevents duplicate leads.

3. **Status Management**: 
   - New leads start as `PENDING`
   - When staff contacts them, update to `CONTACTED`
   - When they complete enrollment, mark as `CONVERTED`
   - If they're no longer interested, mark as `LOST`

4. **Optional Fields**: Most fields are optional because users can save and exit at any step. Only basic user information (name, email) is required.

5. **Data Preservation**: The system preserves all data the user has entered, even if incomplete. This allows staff to follow up and complete the enrollment process.

6. **Frontend Sync**: The frontend should still save to localStorage for quick restoration, but the backend lead ensures data persistence even if localStorage is cleared.

---

## Next Steps

1. Implement lead management dashboard for staff to view and follow up on leads
2. Add email notifications when new leads are created
3. Add lead conversion tracking to measure onboarding completion rates
4. Implement lead assignment to sales staff
5. Add lead activity logging (calls, emails, notes)

