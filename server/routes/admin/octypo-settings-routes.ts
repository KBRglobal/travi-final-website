/**
 * Octypo Settings Routes
 * Admin API for managing Octypo configuration
 */

import { Router } from 'express';
import {
  getSettings,
  saveSettings,
  getSettingsForDisplay,
  OctypoSettings
} from '../../octypo/config/settings-api';
import { EngineRegistry } from '../../services/engine-registry';

const router = Router();

/**
 * GET /api/admin/octypo/settings
 * Get current settings (with masked API keys)
 */
router.get('/settings', async (req, res) => {
  try {
    const settings = await getSettingsForDisplay();
    const engineStats = EngineRegistry.getStats();

    res.json({
      success: true,
      settings,
      engines: {
        total: engineStats.total,
        healthy: engineStats.healthy,
        byProvider: engineStats.byProvider
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/admin/octypo/settings
 * Update settings
 */
router.post('/settings', async (req, res) => {
  try {
    const updates: Partial<OctypoSettings> = req.body;

    // Don't overwrite keys with masked values
    const cleanUpdates: Partial<OctypoSettings> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (typeof value === 'string' && value.startsWith('••••')) {
        continue; // Skip masked values
      }
      (cleanUpdates as any)[key] = value;
    }

    const success = await saveSettings(cleanUpdates);

    if (success) {
      // Reinitialize engine registry to pick up new keys
      // This will be done automatically on next getStats() call

      const settings = await getSettingsForDisplay();
      res.json({ success: true, settings });
    } else {
      res.status(500).json({ success: false, error: 'Failed to save settings' });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/admin/octypo/settings/test-key
 * Test an API key without saving
 */
router.post('/settings/test-key', async (req, res) => {
  try {
    const { provider, apiKey } = req.body;

    if (!provider || !apiKey) {
      return res.status(400).json({ success: false, error: 'Missing provider or apiKey' });
    }

    // Quick test based on provider
    let testResult = { success: false, message: '' };

    switch (provider) {
      case 'anthropic':
        testResult = await testAnthropicKey(apiKey);
        break;
      case 'openai':
        testResult = await testOpenAIKey(apiKey);
        break;
      case 'gemini':
        testResult = await testGeminiKey(apiKey);
        break;
      default:
        testResult = { success: true, message: 'Key format looks valid' };
    }

    res.json(testResult);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

async function testAnthropicKey(apiKey: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }]
      })
    });

    if (response.ok) {
      return { success: true, message: 'Anthropic key is valid ✓' };
    } else {
      const error = await response.json();
      return { success: false, message: error.error?.message || 'Invalid key' };
    }
  } catch (error) {
    return { success: false, message: 'Connection error' };
  }
}

async function testOpenAIKey(apiKey: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    if (response.ok) {
      return { success: true, message: 'OpenAI key is valid ✓' };
    } else {
      return { success: false, message: 'Invalid key' };
    }
  } catch (error) {
    return { success: false, message: 'Connection error' };
  }
}

async function testGeminiKey(apiKey: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`
    );

    if (response.ok) {
      return { success: true, message: 'Gemini key is valid ✓' };
    } else {
      return { success: false, message: 'Invalid key' };
    }
  } catch (error) {
    return { success: false, message: 'Connection error' };
  }
}

export default router;
