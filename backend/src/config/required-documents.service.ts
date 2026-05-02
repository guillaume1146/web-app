import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RolesResolverService } from '../shared/services/roles-resolver.service';

export interface RequiredDocItem {
  documentName: string;
  required: boolean;
}

@Injectable()
export class RequiredDocumentsService {
  constructor(
    private prisma: PrismaService,
    private rolesResolver: RolesResolverService,
  ) {}

  /**
   * Returns required documents for a given role identifier (cookie value, slug,
   * or enum code). Resolves the canonical code via {@link RolesResolverService}.
   */
  async listForRole(userType?: string): Promise<RequiredDocItem[] | Record<string, RequiredDocItem[]>> {
    try {
      let normalized: string | null = null;
      if (userType) {
        normalized = await this.rolesResolver.signupToCodeAsync(userType)
          ?? userType.toUpperCase();
      }

      const where = normalized ? { userType: normalized } : {};
      const configs = await this.prisma.requiredDocumentConfig.findMany({
        where,
        orderBy: [{ userType: 'asc' }, { documentName: 'asc' }],
      });

      if (userType) {
        return configs.map(c => ({ documentName: c.documentName, required: c.required }));
      }

      const grouped: Record<string, RequiredDocItem[]> = {};
      for (const c of configs) {
        if (!grouped[c.userType]) grouped[c.userType] = [];
        grouped[c.userType].push({ documentName: c.documentName, required: c.required });
      }
      return grouped;
    } catch {
      return userType ? [] : {};
    }
  }
}
