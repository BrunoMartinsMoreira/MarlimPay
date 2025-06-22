/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  createUserSchema,
  updateUserSchema,
  userParamsSchema,
  CreateUserDTO,
  UpdateUserDTO,
} from '..';

describe('Schema Validation Tests', () => {
  describe('createUserSchema', () => {
    it('should validate correct user data', () => {
      const validData = {
        name: 'João Silva',
        email: 'joao@example.com',
        balance: 1000,
      };

      const result = createUserSchema.parse(validData);

      expect(result).toEqual(validData);
    });

    describe('name validation', () => {
      it('should reject empty name', () => {
        const invalidData = {
          name: '',
          email: 'joao@example.com',
          balance: 1000,
        };

        expect(() => createUserSchema.parse(invalidData)).toThrow(
          'Nome é obrigatório',
        );
      });

      it('should reject missing name', () => {
        const invalidData = {
          email: 'joao@example.com',
          balance: 1000,
        };

        expect(() => createUserSchema.parse(invalidData)).toThrow(
          'Nome é obrigatório',
        );
      });

      it('should accept valid name', () => {
        const validData = {
          name: 'João Silva dos Santos',
          email: 'joao@example.com',
          balance: 1000,
        };

        const result = createUserSchema.parse(validData);

        expect(result.name).toBe('João Silva dos Santos');
      });
    });

    describe('email validation', () => {
      it('should reject invalid email format', () => {
        const invalidData = {
          name: 'João Silva',
          email: 'invalid-email',
          balance: 1000,
        };

        expect(() => createUserSchema.parse(invalidData)).toThrow(
          'Email deve ser um email válido',
        );
      });

      it('should reject missing email', () => {
        const invalidData = {
          name: 'João Silva',
          balance: 1000,
        };

        expect(() => createUserSchema.parse(invalidData)).toThrow(
          'Email é obrigatório',
        );
      });

      it('should accept valid email formats', () => {
        const validEmails = [
          'test@example.com',
          'user.name@domain.co.uk',
          'user+tag@example.org',
          'test123@test-domain.com',
        ];

        validEmails.forEach((email) => {
          const validData = {
            name: 'João Silva',
            email,
            balance: 1000,
          };

          const result = createUserSchema.parse(validData);
          expect(result.email).toBe(email);
        });
      });
    });

    describe('balance validation', () => {
      it('should reject negative balance', () => {
        const invalidData = {
          name: 'João Silva',
          email: 'joao@example.com',
          balance: -100,
        };

        expect(() => createUserSchema.parse(invalidData)).toThrow(
          'Balance deve ser maior que zero',
        );
      });

      it('should reject zero balance', () => {
        const invalidData = {
          name: 'João Silva',
          email: 'joao@example.com',
          balance: 0,
        };

        expect(() => createUserSchema.parse(invalidData)).toThrow(
          'Balance deve ser maior que zero',
        );
      });

      it('should reject missing balance', () => {
        const invalidData = {
          name: 'João Silva',
          email: 'joao@example.com',
        };

        expect(() => createUserSchema.parse(invalidData)).toThrow(
          'Balance é obrigatório',
        );
      });

      it('should accept positive balance', () => {
        const validBalances = [0.01, 1, 100, 1000.5, 999999.99];

        validBalances.forEach((balance) => {
          const validData = {
            name: 'João Silva',
            email: 'joao@example.com',
            balance,
          };

          const result = createUserSchema.parse(validData);
          expect(result.balance).toBe(balance);
        });
      });

      it('should reject non-numeric balance', () => {
        const invalidData = {
          name: 'João Silva',
          email: 'joao@example.com',
          balance: 'invalid' as any,
        };

        expect(() => createUserSchema.parse(invalidData)).toThrow();
      });
    });

    describe('extra fields', () => {
      it('should strip unknown fields', () => {
        const dataWithExtraFields = {
          name: 'João Silva',
          email: 'joao@example.com',
          balance: 1000,
          unknownField: 'should be removed',
          anotherId: 123,
        };

        const result = createUserSchema.parse(dataWithExtraFields);

        expect(result).toEqual({
          name: 'João Silva',
          email: 'joao@example.com',
          balance: 1000,
        });
        expect(result).not.toHaveProperty('unknownField');
        expect(result).not.toHaveProperty('anotherId');
      });
    });
  });

  describe('updateUserSchema', () => {
    it('should validate correct update data', () => {
      const validData = {
        name: 'João Silva Atualizado',
        email: 'joao.novo@example.com',
      };

      const result = updateUserSchema.parse(validData);

      expect(result).toEqual(validData);
    });

    describe('name validation', () => {
      it('should reject empty name', () => {
        const invalidData = {
          name: '',
          email: 'joao@example.com',
        };

        expect(() => updateUserSchema.parse(invalidData)).toThrow(
          'Nome é obrigatório',
        );
      });

      it('should accept valid name', () => {
        const validData = {
          name: 'Nome Atualizado',
          email: 'email@example.com',
        };

        const result = updateUserSchema.parse(validData);

        expect(result.name).toBe('Nome Atualizado');
      });
    });

    describe('email validation', () => {
      it('should reject invalid email format', () => {
        const invalidData = {
          name: 'João Silva',
          email: 'invalid-email',
        };

        expect(() => updateUserSchema.parse(invalidData)).toThrow(
          'Email deve ser um email válido',
        );
      });

      it('should accept valid email', () => {
        const validData = {
          name: 'João Silva',
          email: 'novo@example.com',
        };

        const result = updateUserSchema.parse(validData);

        expect(result.email).toBe('novo@example.com');
      });
    });

    describe('optional fields', () => {
      it('should accept partial updates - only name', () => {
        const partialData = {
          name: 'Apenas Nome',
        };

        expect(() => updateUserSchema.parse(partialData)).toThrow();
      });

      it('should accept partial updates - only email', () => {
        const partialData = {
          email: 'apenas@email.com',
        };

        expect(() => updateUserSchema.parse(partialData)).toThrow();
      });
    });

    describe('extra fields', () => {
      it('should strip unknown fields', () => {
        const dataWithExtraFields = {
          name: 'João Silva',
          email: 'joao@example.com',
          balance: 2000,
          user_id: 'should-be-removed',
          extraField: 'remove me',
        };

        const result = updateUserSchema.parse(dataWithExtraFields);

        expect(result).toEqual({
          name: 'João Silva',
          email: 'joao@example.com',
        });
        expect(result).not.toHaveProperty('balance');
        expect(result).not.toHaveProperty('user_id');
        expect(result).not.toHaveProperty('extraField');
      });
    });
  });

  describe('userParamsSchema', () => {
    it('should validate correct user_id parameter', () => {
      const validParams = {
        user_id: 'user-123',
      };

      const result = userParamsSchema.parse(validParams);

      expect(result).toEqual(validParams);
    });

    it('should reject empty user_id', () => {
      const invalidParams = {
        user_id: '',
      };

      expect(() => userParamsSchema.parse(invalidParams)).toThrow(
        'user_id é um parametro obrigatorio',
      );
    });

    it('should reject missing user_id', () => {
      const invalidParams = {};

      expect(() => userParamsSchema.parse(invalidParams)).toThrow();
    });

    it('should accept various user_id formats', () => {
      const validUserIds = [
        'user-123',
        'uuid-format-id',
        '12345',
        'user_with_underscores',
        'a1b2c3d4e5f6',
      ];

      validUserIds.forEach((user_id) => {
        const validParams = { user_id };
        const result = userParamsSchema.parse(validParams);
        expect(result.user_id).toBe(user_id);
      });
    });

    it('should strip extra parameters', () => {
      const paramsWithExtras = {
        user_id: 'user-123',
        extraParam: 'should be removed',
        anotherParam: 456,
      };

      const result = userParamsSchema.parse(paramsWithExtras);

      expect(result).toEqual({
        user_id: 'user-123',
      });
      expect(result).not.toHaveProperty('extraParam');
      expect(result).not.toHaveProperty('anotherParam');
    });
  });

  describe('Type inference tests', () => {
    it('should infer correct CreateUserDTO type', () => {
      const userData: CreateUserDTO = {
        name: 'João Silva',
        email: 'joao@example.com',
        balance: 1000,
      };

      const result = createUserSchema.parse(userData);

      expect(typeof result.name).toBe('string');
      expect(typeof result.email).toBe('string');
      expect(typeof result.balance).toBe('number');
    });

    it('should infer correct UpdateUserDTO type', () => {
      const updateData: UpdateUserDTO = {
        name: 'João Atualizado',
        email: 'joao.novo@example.com',
      };

      const result = updateUserSchema.parse(updateData);

      expect(typeof result.name).toBe('string');
      expect(typeof result.email).toBe('string');
      expect(result).not.toHaveProperty('balance');
    });
  });

  describe('Error messages', () => {
    it('should provide detailed error messages for multiple validation failures', () => {
      const invalidData = {
        name: '',
        email: 'invalid-email',
        balance: -100,
      };

      try {
        createUserSchema.parse(invalidData);
        fail('Should have thrown validation error');
      } catch (error: any) {
        expect(error.errors).toHaveLength(3);
        expect(
          error.errors.some((e: any) =>
            e.message.includes('Nome é obrigatório'),
          ),
        ).toBe(true);
        expect(
          error.errors.some((e: any) =>
            e.message.includes('Email deve ser um email válido'),
          ),
        ).toBe(true);
        expect(
          error.errors.some((e: any) =>
            e.message.includes('Balance deve ser maior que zero'),
          ),
        ).toBe(true);
      }
    });

    it('should provide specific field path in error messages', () => {
      const invalidData = {
        name: 'Valid Name',
        email: 'invalid-email',
        balance: 1000,
      };

      try {
        createUserSchema.parse(invalidData);
        fail('Should have thrown validation error');
      } catch (error: any) {
        expect(error.errors[0].path).toEqual(['email']);
        expect(error.errors[0].message).toBe('Email deve ser um email válido');
      }
    });
  });

  describe('Edge cases and boundary values', () => {
    it('should handle very long names', () => {
      const longName = 'a'.repeat(1000);
      const validData = {
        name: longName,
        email: 'test@example.com',
        balance: 1000,
      };

      const result = createUserSchema.parse(validData);

      expect(result.name).toBe(longName);
    });

    it('should handle very small positive balance', () => {
      const validData = {
        name: 'Test User',
        email: 'test@example.com',
        balance: 0.01,
      };

      const result = createUserSchema.parse(validData);

      expect(result.balance).toBe(0.01);
    });

    it('should handle very large balance', () => {
      const validData = {
        name: 'Test User',
        email: 'test@example.com',
        balance: 999999999.99,
      };

      const result = createUserSchema.parse(validData);

      expect(result.balance).toBe(999999999.99);
    });

    it('should handle special characters in name', () => {
      const specialName = 'José María Ñuñez-García';
      const validData = {
        name: specialName,
        email: 'jose@example.com',
        balance: 1000,
      };

      const result = createUserSchema.parse(validData);

      expect(result.name).toBe(specialName);
    });
  });
});
