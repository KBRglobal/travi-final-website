/**
 * Email Template Renderer
 * Renders templates to HTML with variable substitution
 */

import type { EmailTemplateBlock } from "@shared/schema";
import type { TemplateBlockContent, TemplateBlockStyles } from "./template-builder";

// ============================================================================
// VARIABLE SUBSTITUTION
// ============================================================================

export interface TemplateVariables {
  // Subscriber variables
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  
  // Company variables
  company_name?: string;
  company_logo?: string;
  company_address?: string;
  website_url?: string;
  
  // Campaign variables
  unsubscribe_link: string;
  view_in_browser_link?: string;
  
  // Custom variables
  [key: string]: string | undefined;
}

/**
 * Replace template variables in text
 */
function replaceVariables(text: string, variables: TemplateVariables): string {
  let result = text;
  
  for (const [key, value] of Object.entries(variables)) {
    if (value !== undefined) {
      const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      result = result.replace(placeholder, value);
    }
  }
  
  return result;
}

// ============================================================================
// BLOCK RENDERERS
// ============================================================================

/**
 * Render styles as inline CSS
 */
function renderStyles(styles: TemplateBlockStyles): string {
  const css: string[] = [];
  
  if (styles.backgroundColor) css.push(`background-color: ${styles.backgroundColor}`);
  if (styles.textColor) css.push(`color: ${styles.textColor}`);
  if (styles.fontSize) css.push(`font-size: ${styles.fontSize}`);
  if (styles.fontWeight) css.push(`font-weight: ${styles.fontWeight}`);
  if (styles.textAlign) css.push(`text-align: ${styles.textAlign}`);
  if (styles.padding) css.push(`padding: ${styles.padding}`);
  if (styles.margin) css.push(`margin: ${styles.margin}`);
  if (styles.borderRadius) css.push(`border-radius: ${styles.borderRadius}`);
  
  return css.join("; ");
}

/**
 * Render header block
 */
function renderHeader(content: TemplateBlockContent, styles: TemplateBlockStyles, variables: TemplateVariables): string {
  const logo = replaceVariables(content.logo || "", variables);
  const logoAlt = replaceVariables(content.logoAlt || "", variables);
  const logoLink = replaceVariables(content.logoLink || "", variables);
  const styleAttr = renderStyles(styles);
  
  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="${styleAttr}">
          ${logoLink ? `<a href="${logoLink}">` : ""}
            <img src="${logo}" alt="${logoAlt}" style="max-width: 200px; height: auto;" />
          ${logoLink ? `</a>` : ""}
        </td>
      </tr>
    </table>
  `;
}

/**
 * Render text block
 */
function renderText(content: TemplateBlockContent, styles: TemplateBlockStyles, variables: TemplateVariables): string {
  const heading = content.heading ? replaceVariables(content.heading, variables) : "";
  const text = content.text ? replaceVariables(content.text, variables) : "";
  const styleAttr = renderStyles(styles);
  
  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="${styleAttr}">
          ${heading ? `<h2 style="margin: 0 0 16px 0; font-size: 24px;">${heading}</h2>` : ""}
          ${text ? `<p style="margin: 0; line-height: 1.6;">${text}</p>` : ""}
        </td>
      </tr>
    </table>
  `;
}

/**
 * Render image block
 */
function renderImage(content: TemplateBlockContent, styles: TemplateBlockStyles, variables: TemplateVariables): string {
  const imageUrl = replaceVariables(content.imageUrl || "", variables);
  const imageAlt = replaceVariables(content.imageAlt || "", variables);
  const imageLink = content.imageLink ? replaceVariables(content.imageLink, variables) : "";
  const styleAttr = renderStyles(styles);
  
  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="${styleAttr}">
          ${imageLink ? `<a href="${imageLink}">` : ""}
            <img src="${imageUrl}" alt="${imageAlt}" style="max-width: 100%; height: auto; display: block;" />
          ${imageLink ? `</a>` : ""}
        </td>
      </tr>
    </table>
  `;
}

/**
 * Render button block
 */
function renderButton(content: TemplateBlockContent, styles: TemplateBlockStyles, variables: TemplateVariables): string {
  const buttonText = replaceVariables(content.buttonText || "Click Here", variables);
  const buttonLink = replaceVariables(content.buttonLink || "#", variables);
  const buttonColor = styles.buttonColor || "#0066cc";
  const buttonTextColor = styles.buttonTextColor || "#ffffff";
  const styleAttr = renderStyles(styles);
  
  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="${styleAttr}">
          <a href="${buttonLink}" style="
            display: inline-block;
            padding: 12px 30px;
            background-color: ${buttonColor};
            color: ${buttonTextColor};
            text-decoration: none;
            border-radius: 4px;
            font-weight: 600;
          ">${buttonText}</a>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Render divider block
 */
function renderDivider(content: TemplateBlockContent, styles: TemplateBlockStyles): string {
  const dividerStyle = content.dividerStyle || "solid";
  const styleAttr = renderStyles(styles);
  
  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="${styleAttr}">
          <hr style="border: none; border-top: 1px ${dividerStyle} #dddddd; margin: 0;" />
        </td>
      </tr>
    </table>
  `;
}

/**
 * Render footer block
 */
function renderFooter(content: TemplateBlockContent, styles: TemplateBlockStyles, variables: TemplateVariables): string {
  const companyName = replaceVariables(content.companyName || "", variables);
  const address = content.address ? replaceVariables(content.address, variables) : "";
  const unsubscribeLink = replaceVariables(content.unsubscribeLink || "", variables);
  const socialLinks = content.socialLinks || [];
  const styleAttr = renderStyles(styles);
  
  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="${styleAttr}">
          ${companyName ? `<p style="margin: 0 0 8px 0; font-weight: 600;">${companyName}</p>` : ""}
          ${address ? `<p style="margin: 0 0 8px 0;">${address}</p>` : ""}
          ${socialLinks.length > 0 ? `
            <p style="margin: 0 0 16px 0;">
              ${socialLinks.map(link => `
                <a href="${link.url}" style="color: #666666; text-decoration: none; margin-right: 12px;">
                  ${link.platform}
                </a>
              `).join("")}
            </p>
          ` : ""}
          ${unsubscribeLink ? `
            <p style="margin: 0;">
              <a href="${unsubscribeLink}" style="color: #666666; text-decoration: underline;">
                Unsubscribe
              </a>
            </p>
          ` : ""}
        </td>
      </tr>
    </table>
  `;
}

/**
 * Render a single block
 */
function renderBlock(block: EmailTemplateBlock, variables: TemplateVariables): string {
  const content = block.content as TemplateBlockContent;
  const styles = block.styles as TemplateBlockStyles;
  
  switch (block.type) {
    case "header":
      return renderHeader(content, styles, variables);
    case "text":
      return renderText(content, styles, variables);
    case "image":
      return renderImage(content, styles, variables);
    case "button":
      return renderButton(content, styles, variables);
    case "divider":
      return renderDivider(content, styles);
    case "footer":
      return renderFooter(content, styles, variables);
    default:
      return "";
  }
}

// ============================================================================
// TEMPLATE RENDERING
// ============================================================================

/**
 * Render complete HTML email from template blocks
 */
export function renderTemplate(
  blocks: EmailTemplateBlock[],
  variables: TemplateVariables
): string {
  const sortedBlocks = [...blocks].sort((a, b) => a.order - b.order);
  const renderedBlocks = sortedBlocks.map(block => renderBlock(block, variables)).join("\n");
  
  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Email</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse; max-width: 600px;">
    <tr>
      <td>
        ${renderedBlocks}
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Render plain text version of email
 */
export function renderPlainText(
  blocks: EmailTemplateBlock[],
  variables: TemplateVariables
): string {
  const sortedBlocks = [...blocks].sort((a, b) => a.order - b.order);
  
  const textParts: string[] = [];
  
  for (const block of sortedBlocks) {
    const content = block.content as TemplateBlockContent;
    
    switch (block.type) {
      case "text":
        if (content.heading) {
          textParts.push(replaceVariables(content.heading, variables).toUpperCase());
          textParts.push("=".repeat(50));
        }
        if (content.text) {
          textParts.push(replaceVariables(content.text, variables));
        }
        textParts.push("");
        break;
        
      case "button":
        if (content.buttonText && content.buttonLink) {
          textParts.push(`${replaceVariables(content.buttonText, variables)}: ${replaceVariables(content.buttonLink, variables)}`);
          textParts.push("");
        }
        break;
        
      case "divider":
        textParts.push("-".repeat(50));
        textParts.push("");
        break;
        
      case "footer":
        if (content.companyName) {
          textParts.push(replaceVariables(content.companyName, variables));
        }
        if (content.address) {
          textParts.push(replaceVariables(content.address, variables));
        }
        if (content.unsubscribeLink) {
          textParts.push(`Unsubscribe: ${replaceVariables(content.unsubscribeLink, variables)}`);
        }
        break;
    }
  }
  
  return textParts.join("\n");
}

/**
 * Validate template variables
 */
export function validateVariables(
  blocks: EmailTemplateBlock[],
  variables: TemplateVariables
): { valid: boolean; missingVariables: string[] } {
  const requiredVars = new Set<string>();
  const variablePattern = /\{\{([^{}]+)\}\}/g;
  
  // Extract all variables from blocks
  for (const block of blocks) {
    const blockJson = JSON.stringify(block);
    let match;
    
    while ((match = variablePattern.exec(blockJson)) !== null) {
      requiredVars.add(match[1]);
    }
  }
  
  // Check which required variables are missing
  const missingVariables: string[] = [];
  
  for (const varName of requiredVars) {
    if (variables[varName] === undefined) {
      missingVariables.push(varName);
    }
  }
  
  return {
    valid: missingVariables.length === 0,
    missingVariables,
  };
}
