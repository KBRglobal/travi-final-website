import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ROLE_PERMISSIONS } from '@shared/schema';

describe('Role Permissions', () => {
  describe('ROLE_PERMISSIONS structure', () => {
    it('should have all 5 role types defined', () => {
      expect(ROLE_PERMISSIONS).toHaveProperty('admin');
      expect(ROLE_PERMISSIONS).toHaveProperty('editor');
      expect(ROLE_PERMISSIONS).toHaveProperty('author');
      expect(ROLE_PERMISSIONS).toHaveProperty('contributor');
      expect(ROLE_PERMISSIONS).toHaveProperty('viewer');
    });

    it('admin should have all permissions', () => {
      const adminPerms = ROLE_PERMISSIONS.admin;
      expect(adminPerms.canCreate).toBe(true);
      expect(adminPerms.canEdit).toBe(true);
      expect(adminPerms.canDelete).toBe(true);
      expect(adminPerms.canPublish).toBe(true);
      expect(adminPerms.canManageUsers).toBe(true);
      expect(adminPerms.canManageSettings).toBe(true);
      expect(adminPerms.canViewAnalytics).toBe(true);
      expect(adminPerms.canAccessMediaLibrary).toBe(true);
    });

    it('viewer should have minimal permissions', () => {
      const viewerPerms = ROLE_PERMISSIONS.viewer;
      expect(viewerPerms.canCreate).toBe(false);
      expect(viewerPerms.canEdit).toBe(false);
      expect(viewerPerms.canDelete).toBe(false);
      expect(viewerPerms.canPublish).toBe(false);
      expect(viewerPerms.canManageUsers).toBe(false);
      expect(viewerPerms.canManageSettings).toBe(false);
    });

    it('editor should be able to publish but not manage users', () => {
      const editorPerms = ROLE_PERMISSIONS.editor;
      expect(editorPerms.canCreate).toBe(true);
      expect(editorPerms.canEdit).toBe(true);
      expect(editorPerms.canPublish).toBe(true);
      expect(editorPerms.canManageUsers).toBe(false);
    });

    it('author should be able to create and edit own but not publish', () => {
      const authorPerms = ROLE_PERMISSIONS.author;
      expect(authorPerms.canCreate).toBe(true);
      expect(authorPerms.canEdit).toBe(false); // Can't edit all content
      expect(authorPerms.canEditOwn).toBe(true); // Can edit own content
      expect(authorPerms.canPublish).toBe(false);
    });

    it('contributor should only be able to create drafts', () => {
      const contributorPerms = ROLE_PERMISSIONS.contributor;
      expect(contributorPerms.canCreate).toBe(true);
      expect(contributorPerms.canEdit).toBe(false);
      expect(contributorPerms.canPublish).toBe(false);
    });
  });
});

describe('Permission Checks', () => {
  const checkPermission = (role: keyof typeof ROLE_PERMISSIONS, permission: string): boolean => {
    const perms = ROLE_PERMISSIONS[role];
    return perms[permission as keyof typeof perms] ?? false;
  };

  it('should correctly check canPublish permission', () => {
    expect(checkPermission('admin', 'canPublish')).toBe(true);
    expect(checkPermission('editor', 'canPublish')).toBe(true);
    expect(checkPermission('author', 'canPublish')).toBe(false);
    expect(checkPermission('contributor', 'canPublish')).toBe(false);
    expect(checkPermission('viewer', 'canPublish')).toBe(false);
  });

  it('should correctly check canManageUsers permission', () => {
    expect(checkPermission('admin', 'canManageUsers')).toBe(true);
    expect(checkPermission('editor', 'canManageUsers')).toBe(false);
    expect(checkPermission('author', 'canManageUsers')).toBe(false);
  });
});
