// ============================================================================
// MES ERROR HANDLING SYSTEM - COMPREHENSIVE GUIDE
// ============================================================================

// 1. ERROR TYPES & CLASSIFICATIONS
// ============================================================================

export enum ErrorCategory {
  DATABASE = 'DATABASE',
  VALIDATION = 'VALIDATION',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NETWORK = 'NETWORK',
  INTEGRATION = 'INTEGRATION',
  UNKNOWN = 'UNKNOWN'
}

export enum ErrorSeverity {
  CRITICAL = 'CRITICAL',    // Production stopped, immediate action needed
  HIGH = 'HIGH',            // Major functionality affected
  MEDIUM = 'MEDIUM',        // Feature degradation
  LOW = 'LOW',              // Minor issues
  INFO = 'INFO'             // Informational
}

// Custom Error Classes
export class MESError extends Error {
  category: ErrorCategory;
  severity: ErrorSeverity;
  code: string;
  timestamp: Date;
  context?: Record<string, any>;
  userMessage: string;
  technicalMessage: string;

  constructor(
    code: string,
    userMessage: string,
    technicalMessage: string,
    category: ErrorCategory,
    severity: ErrorSeverity,
    context?: Record<string, any>
  ) {
    super(technicalMessage);
    this.name = 'MESError';
    this.code = code;
    this.userMessage = userMessage;
    this.technicalMessage = technicalMessage;
    this.category = category;
    this.severity = severity;
    this.timestamp = new Date();
    this.context = context;
  }
}

// 2. SUPABASE-SPECIFIC ERROR HANDLING
// ============================================================================

export class SupabaseErrorHandler {
  static handle(error: any, operation: string, context?: Record<string, any>): MESError {
    // PostgreSQL error codes
    const pgErrorMap: Record<string, { message: string; severity: ErrorSeverity }> = {
      '23505': { 
        message: 'This record already exists. Please check for duplicates.', 
        severity: ErrorSeverity.MEDIUM 
      },
      '23503': { 
        message: 'Cannot delete this record as it is referenced by other data.', 
        severity: ErrorSeverity.HIGH 
      },
      '23502': { 
        message: 'Required field is missing. Please fill in all required information.', 
        severity: ErrorSeverity.MEDIUM 
      },
      '42P01': { 
        message: 'Database configuration error. Please contact support.', 
        severity: ErrorSeverity.CRITICAL 
      },
      '42703': { 
        message: 'Invalid data field. Please refresh and try again.', 
        severity: ErrorSeverity.MEDIUM 
      },
      '22P02': { 
        message: 'Invalid data format. Please check your input.', 
        severity: ErrorSeverity.MEDIUM 
      },
      '08006': { 
        message: 'Database connection lost. Reconnecting...', 
        severity: ErrorSeverity.HIGH 
      }
    };

    const errorCode = error?.code || error?.error?.code;
    const mapped = pgErrorMap[errorCode];

    if (mapped) {
      return new MESError(
        `DB_${errorCode}`,
        mapped.message,
        `${operation}: ${error.message}`,
        ErrorCategory.DATABASE,
        mapped.severity,
        { ...context, originalError: error }
      );
    }

    // Supabase-specific errors
    if (error?.message?.includes('JWT')) {
      return new MESError(
        'AUTH_SESSION_EXPIRED',
        'Your session has expired. Please login again.',
        `${operation}: ${error.message}`,
        ErrorCategory.AUTHENTICATION,
        ErrorSeverity.MEDIUM,
        context
      );
    }

    if (error?.message?.includes('permission')) {
      return new MESError(
        'AUTH_PERMISSION_DENIED',
        'You do not have permission to perform this action.',
        `${operation}: ${error.message}`,
        ErrorCategory.AUTHORIZATION,
        ErrorSeverity.MEDIUM,
        context
      );
    }

    // Generic database error
    return new MESError(
      'DB_UNKNOWN',
      'A database error occurred. Please try again or contact support.',
      `${operation}: ${error.message}`,
      ErrorCategory.DATABASE,
      ErrorSeverity.HIGH,
      { ...context, originalError: error }
    );
  }
}

// 3. BUSINESS LOGIC ERROR HANDLERS
// ============================================================================

export class ManufacturingErrorHandler {
  // Part-related errors
  static partNotFound(partNumber: string): MESError {
    return new MESError(
      'PART_NOT_FOUND',
      `Part ${partNumber} not found in the system.`,
      `Attempted to access non-existent part: ${partNumber}`,
      ErrorCategory.BUSINESS_LOGIC,
      ErrorSeverity.MEDIUM,
      { partNumber }
    );
  }

  static partAlreadyInStep(partNumber: string, stepName: string): MESError {
    return new MESError(
      'PART_STEP_CONFLICT',
      `Part ${partNumber} is already in step: ${stepName}`,
      `Duplicate step assignment detected`,
      ErrorCategory.BUSINESS_LOGIC,
      ErrorSeverity.MEDIUM,
      { partNumber, stepName }
    );
  }

  // Mould-related errors
  static mouldNotAvailable(mouldCode: string, reason: string): MESError {
    return new MESError(
      'MOULD_UNAVAILABLE',
      `Mould ${mouldCode} is currently unavailable: ${reason}`,
      `Mould allocation failed`,
      ErrorCategory.BUSINESS_LOGIC,
      ErrorSeverity.HIGH,
      { mouldCode, reason }
    );
  }

  // Supply/Material errors
  static insufficientMaterial(materialType: string, required: number, available: number): MESError {
    return new MESError(
      'MATERIAL_INSUFFICIENT',
      `Insufficient ${materialType}. Required: ${required}, Available: ${available}`,
      `Material shortage detected`,
      ErrorCategory.BUSINESS_LOGIC,
      ErrorSeverity.HIGH,
      { materialType, required, available, shortage: required - available }
    );
  }

  static materialExpired(lotNumber: string, expiryDate: Date): MESError {
    return new MESError(
      'MATERIAL_EXPIRED',
      `Material lot ${lotNumber} has expired on ${expiryDate.toLocaleDateString()}`,
      `Expired material usage attempted`,
      ErrorCategory.BUSINESS_LOGIC,
      ErrorSeverity.CRITICAL,
      { lotNumber, expiryDate }
    );
  }

  // QA/Checkpoint errors
  static checkpointNotPassed(checkpointName: string, reason: string): MESError {
    return new MESError(
      'QA_CHECKPOINT_FAILED',
      `Quality checkpoint "${checkpointName}" failed: ${reason}`,
      `QA gate not passed`,
      ErrorCategory.BUSINESS_LOGIC,
      ErrorSeverity.HIGH,
      { checkpointName, reason }
    );
  }

  static missingQAApproval(stepName: string): MESError {
    return new MESError(
      'QA_APPROVAL_REQUIRED',
      `QA approval is required before proceeding from ${stepName}`,
      `QA gate approval missing`,
      ErrorCategory.BUSINESS_LOGIC,
      ErrorSeverity.HIGH,
      { stepName }
    );
  }

  // Workflow errors
  static invalidStateTransition(currentState: string, targetState: string): MESError {
    return new MESError(
      'INVALID_STATE_TRANSITION',
      `Cannot change from ${currentState} to ${targetState}`,
      `Invalid workflow state transition`,
      ErrorCategory.BUSINESS_LOGIC,
      ErrorSeverity.MEDIUM,
      { currentState, targetState }
    );
  }

  static stepPrerequisiteNotMet(stepName: string, prerequisite: string): MESError {
    return new MESError(
      'STEP_PREREQUISITE_NOT_MET',
      `Cannot start ${stepName}: ${prerequisite} not completed`,
      `Step prerequisite validation failed`,
      ErrorCategory.BUSINESS_LOGIC,
      ErrorSeverity.MEDIUM,
      { stepName, prerequisite }
    );
  }
}

// 4. VALIDATION ERROR HANDLER
// ============================================================================

export class ValidationErrorHandler {
  static invalidInput(field: string, value: any, reason: string): MESError {
    return new MESError(
      'VALIDATION_INVALID_INPUT',
      `Invalid ${field}: ${reason}`,
      `Validation failed for field: ${field}`,
      ErrorCategory.VALIDATION,
      ErrorSeverity.LOW,
      { field, value, reason }
    );
  }

  static requiredFieldMissing(field: string): MESError {
    return new MESError(
      'VALIDATION_REQUIRED_FIELD',
      `${field} is required`,
      `Required field validation failed`,
      ErrorCategory.VALIDATION,
      ErrorSeverity.MEDIUM,
      { field }
    );
  }

  static outOfRange(field: string, value: any, min: any, max: any): MESError {
    return new MESError(
      'VALIDATION_OUT_OF_RANGE',
      `${field} must be between ${min} and ${max}`,
      `Range validation failed`,
      ErrorCategory.VALIDATION,
      ErrorSeverity.MEDIUM,
      { field, value, min, max }
    );
  }
}

// 5. PRACTICAL USAGE PATTERNS
// ============================================================================

// Example: Supabase Database Operations
export class PartService {
  private supabase: any; // Your Supabase client

  async createPart(partData: any) {
    try {
      // Validation
      if (!partData.partNumber) {
        throw ValidationErrorHandler.requiredFieldMissing('Part Number');
      }

      // Database operation
      const { data, error } = await this.supabase
        .from('parts')
        .insert(partData)
        .select()
        .single();

      if (error) {
        throw SupabaseErrorHandler.handle(error, 'createPart', { partData });
      }

      return { success: true, data };
    } catch (error) {
      if (error instanceof MESError) {
        throw error;
      }
      throw new MESError(
        'PART_CREATE_FAILED',
        'Failed to create part. Please try again.',
        `Unexpected error in createPart: ${error.message}`,
        ErrorCategory.UNKNOWN,
        ErrorSeverity.HIGH,
        { partData, originalError: error }
      );
    }
  }

  async startStep(partId: number, stepId: number, mouldId?: number) {
    try {
      // Check if mould is required and available
      if (mouldId) {
        const { data: mould, error: mouldError } = await this.supabase
          .from('moulds')
          .select('*')
          .eq('id', mouldId)
          .single();

        if (mouldError) {
          throw SupabaseErrorHandler.handle(mouldError, 'checkMould', { mouldId });
        }

        if (mould.status !== 'available') {
          throw ManufacturingErrorHandler.mouldNotAvailable(
            mould.code,
            `Status: ${mould.status}`
          );
        }
      }

      // Check material requirements
      const { data: requirements } = await this.supabase
        .from('supplyRequirements')
        .select('*')
        .eq('stepId', stepId)
        .eq('isMandatory', true);

      for (const req of requirements || []) {
        const { data: available } = await this.supabase
          .from('supplyLots')
          .select('quantity')
          .eq('materialType', req.materialType)
          .eq('state', 'usable')
          .gte('quantity', req.quantityRequired);

        if (!available || available.length === 0) {
          throw ManufacturingErrorHandler.insufficientMaterial(
            req.materialType,
            parseFloat(req.quantityRequired),
            0
          );
        }
      }

      // Create step instance
      const { data, error } = await this.supabase
        .from('partStepInstances')
        .insert({
          partId,
          stepId,
          mouldId,
          status: 'active',
          startedAt: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw SupabaseErrorHandler.handle(error, 'startStep', { partId, stepId, mouldId });
      }

      return { success: true, data };
    } catch (error) {
      if (error instanceof MESError) {
        throw error;
      }
      throw new MESError(
        'STEP_START_FAILED',
        'Failed to start step. Please try again.',
        `Unexpected error in startStep: ${error.message}`,
        ErrorCategory.UNKNOWN,
        ErrorSeverity.HIGH,
        { partId, stepId, mouldId, originalError: error }
      );
    }
  }
}

// 6. FRONTEND ERROR DISPLAY COMPONENT
// ============================================================================

export interface ErrorDisplayProps {
  error: MESError;
  onRetry?: () => void;
  onDismiss?: () => void;
}

// React component example (adapt for your framework)
export const ErrorDisplay = ({ error, onRetry, onDismiss }: ErrorDisplayProps) => {
  const getSeverityColor = (severity: ErrorSeverity) => {
    switch (severity) {
      case ErrorSeverity.CRITICAL: return 'bg-red-100 border-red-500 text-red-900';
      case ErrorSeverity.HIGH: return 'bg-orange-100 border-orange-500 text-orange-900';
      case ErrorSeverity.MEDIUM: return 'bg-yellow-100 border-yellow-500 text-yellow-900';
      case ErrorSeverity.LOW: return 'bg-blue-100 border-blue-500 text-blue-900';
      default: return 'bg-gray-100 border-gray-500 text-gray-900';
    }
  };

  return `
    <div class="border-l-4 p-4 ${getSeverityColor(error.severity)} rounded">
      <div class="flex items-start">
        <div class="flex-1">
          <h3 class="font-bold">${error.severity}: ${error.code}</h3>
          <p class="mt-1">${error.userMessage}</p>
          ${error.context ? `
            <details class="mt-2 text-sm">
              <summary class="cursor-pointer">Technical Details</summary>
              <pre class="mt-2 p-2 bg-white rounded">${JSON.stringify(error.context, null, 2)}</pre>
            </details>
          ` : ''}
        </div>
        <div class="ml-4 flex gap-2">
          ${onRetry ? '<button onclick="onRetry()" class="px-3 py-1 bg-white rounded">Retry</button>' : ''}
          ${onDismiss ? '<button onclick="onDismiss()" class="px-3 py-1 bg-white rounded">Dismiss</button>' : ''}
        </div>
      </div>
    </div>
  `;
};

// 7. ERROR LOGGING & MONITORING
// ============================================================================

export class ErrorLogger {
  static async log(error: MESError) {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('MES Error:', {
        code: error.code,
        category: error.category,
        severity: error.severity,
        message: error.technicalMessage,
        context: error.context,
        timestamp: error.timestamp
      });
    }

    // Log to Supabase for tracking
    try {
      const supabase = getSupabaseClient(); // Your Supabase client
      await supabase.from('error_logs').insert({
        code: error.code,
        category: error.category,
        severity: error.severity,
        user_message: error.userMessage,
        technical_message: error.technicalMessage,
        context: error.context,
        timestamp: error.timestamp.toISOString(),
        user_id: getCurrentUserId(), // Your auth function
        session_id: getSessionId()
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    // Send critical errors to monitoring service
    if (error.severity === ErrorSeverity.CRITICAL) {
      // Integrate with your monitoring service (e.g., Sentry, DataDog)
      // sendToMonitoring(error);
    }
  }
}

// 8. GLOBAL ERROR HANDLER
// ============================================================================

export const setupGlobalErrorHandler = () => {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    event.preventDefault();
    const error = new MESError(
      'UNHANDLED_PROMISE',
      'An unexpected error occurred. Please refresh the page.',
      `Unhandled promise rejection: ${event.reason}`,
      ErrorCategory.UNKNOWN,
      ErrorSeverity.HIGH,
      { reason: event.reason }
    );
    ErrorLogger.log(error);
    // Show error to user
  });

  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    const error = new MESError(
      'UNCAUGHT_ERROR',
      'An unexpected error occurred. Please refresh the page.',
      `Uncaught error: ${event.message}`,
      ErrorCategory.UNKNOWN,
      ErrorSeverity.HIGH,
      { 
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      }
    );
    ErrorLogger.log(error);
    // Show error to user
  });
};

// Helper functions (implement based on your setup)
declare function getSupabaseClient(): any;
declare function getCurrentUserId(): string | null;
declare function getSessionId(): string;