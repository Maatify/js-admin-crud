/**
 * 🎨 Admin Kernel - Reusable UI Components Library
 * ================================================
 * Shared components and utilities for ALL admin modules
 *
 * Use this across: Languages, Translations, Admins, Roles, Permissions, etc.
 *
 * File: admin-ui-components.js
 * Location: /assets/maatify/admin-kernel/js/admin-ui-components.js
 */

(function() {
    'use strict';

    console.log('🎨 Admin UI Components Library Loading...');

    // ========================================================================
    // 1. STATUS BADGE RENDERER (Reusable!)
    // ========================================================================

    /**
     * Render status badge with icon
     * Use in: Languages, Admins, Roles, any module with active/inactive status
     *
     * @param {boolean|number|string} value - Status value
     * @param {object} options - Configuration
     * @returns {string} HTML
     */
    function renderStatusBadge(value, options = {}) {
        const {
            clickable = false,
            entityId = null,
            activeText = 'Active',
            inactiveText = 'Inactive',
            buttonClass = 'toggle-status-btn',
            dataAttribute = 'data-entity-id'  // ✅ Support custom attribute
        } = options;

        const isActive = value === true || value === 1 || value === "1";

        // Active badge
        if (isActive) {
            const badge = `
                <span class="inline-flex items-center gap-1 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-400 border border-green-300 dark:border-green-800 px-3 py-1 rounded-lg text-xs font-semibold">
                    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                    </svg>
                    ${activeText}
                </span>
            `;

            if (clickable && entityId) {
                return `<button class="${buttonClass} hover:opacity-75 transition-opacity cursor-pointer"
                            ${dataAttribute}="${entityId}"
                            data-current-status="1"
                            title="Click to deactivate">
                    ${badge}
                </button>`;
            }
            return badge;
        }

        // Inactive badge
        const badge = `
            <span class="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 border border-gray-300 dark:border-gray-700 px-3 py-1 rounded-lg text-xs font-semibold">
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                </svg>
                ${inactiveText}
            </span>
        `;

        if (clickable && entityId) {
            return `<button class="${buttonClass} hover:opacity-75 transition-opacity cursor-pointer"
                        ${dataAttribute}="${entityId}"
                        data-current-status="0"
                        title="Click to activate">
                ${badge}
            </button>`;
        }
        return badge;
    }

    // ========================================================================
    // 2. CODE/TAG BADGE RENDERER (Reusable!)
    // ========================================================================

    /**
     * Render code/tag badge
     * Use in: Languages (code), Roles (slug), Tags, Categories
     *
     * @param {string} value - Code value
     * @param {object} options - Configuration
     * @returns {string} HTML
     */
    function renderCodeBadge(value, options = {}) {
        const {
            color = 'blue',
            uppercase = true,
            dataField = null
        } = options;

        if (!value) return '<span class="text-gray-400 dark:text-gray-500 italic">N/A</span>';

        const displayValue = uppercase ? value.toUpperCase() : value;
        const badge = `<span class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-${color}-100 dark:bg-${color}-900/40 text-${color}-800 dark:text-${color}-400 uppercase">${displayValue}</span>`;

        if (dataField) {
            return `<div data-field="${dataField}">${badge}</div>`;
        }
        return badge;
    }

    // ========================================================================
    // 3. DIRECTION BADGE RENDERER (Reusable!)
    // ========================================================================

    /**
     * Render text direction badge
     * Use in: Languages, Content modules
     *
     * @param {string} value - Direction ('ltr' or 'rtl')
     * @returns {string} HTML
     */
    function renderDirectionBadge(value) {
        const isRTL = value?.toLowerCase() === 'rtl';
        const arrow = isRTL ? '←' : '→';
        const bgColor = isRTL ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400';

        return `<span class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${bgColor}">
            <span class="mr-1">${arrow}</span>
            ${value?.toUpperCase() || 'N/A'}
        </span>`;
    }

    // ========================================================================
    // 4. SORT ORDER BADGE RENDERER (Reusable!)
    // ========================================================================

    /**
     * Render sort order badge
     * Use in: Languages, Menu items, Categories, any sortable list
     *
     * @param {number} value - Sort order number
     * @param {object} options - Configuration
     * @returns {string} HTML
     */
    function renderSortBadge(value, options = {}) {
        const {
            size = 'md', // sm, md, lg
            color = 'indigo'
        } = options;

        if (value === null || value === undefined) {
            return '<span class="text-gray-400 dark:text-gray-500 italic">N/A</span>';
        }

        const sizeClasses = {
            sm: 'w-7 h-7 text-xs',
            md: 'w-9 h-9 text-sm',
            lg: 'w-11 h-11 text-base'
        };

        return `<span class="inline-flex items-center justify-center ${sizeClasses[size]} rounded-lg bg-gradient-to-br from-${color}-50 to-${color}-100 dark:from-${color}-900/30 dark:to-${color}-800/30 border border-${color}-200 dark:border-${color}-700 text-${color}-700 dark:text-${color}-400 font-bold shadow-sm">${value}</span>`;
    }

    // ========================================================================
    // 5. ICON RENDERER (Reusable!)
    // ========================================================================

    /**
     * Render icon with fallback placeholder
     * Use in: Languages, Categories, Menu items
     *
     * @param {string} icon - Icon/emoji
     * @param {object} options - Configuration
     * @returns {string} HTML
     */
    function renderIcon(icon, options = {}) {
        const {
            size = 'md', // sm, md, lg
            fallbackSvg = null
        } = options;

        const sizeClasses = {
            sm: 'w-5 h-5',
            md: 'w-7 h-7',
            lg: 'w-9 h-9'
        };

        if (icon) {
            return `<span class="flex items-center justify-center ${sizeClasses[size]} rounded-md bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-base">${icon}</span>`;
        }

        // Fallback placeholder
        const defaultSvg = fallbackSvg || `
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"/>
            </svg>
        `;

        return `<span class="flex items-center justify-center ${sizeClasses[size]} rounded-md bg-gray-100 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700 text-gray-400 dark:text-gray-500 text-xs">
            ${defaultSvg}
        </span>`;
    }

    // ========================================================================
    // 6. ACTION BUTTON BUILDER (Reusable!)
    // ========================================================================

    /**
     * Build action button with icon
     * Use in: All modules for action buttons
     *
     * @param {object} config - Button configuration
     * @returns {string} HTML
     */
    function buildActionButton(config) {
        const {
            cssClass = '',
            icon = '',
            iconName = '',
            iconClass = 'w-3 h-3',
            text = '',
            color = 'blue', // blue, green, amber, red, purple, indigo
            entityId = null,
            title = '',
            dataAttributes = {}
        } = config;

        const colorClasses = {
            blue: 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-800',
            green: 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-200 dark:hover:border-green-800',
            amber: 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:border-amber-200 dark:hover:border-amber-800',
            red: 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-800',
            purple: 'text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-200 dark:hover:border-purple-800',
            indigo: 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-200 dark:hover:border-indigo-800',
            gray: 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-200 dark:hover:border-gray-600',
            cyan: 'text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 hover:border-cyan-200 dark:hover:border-cyan-800',
            taupe: 'text-taupe-600 dark:text-taupe-400 hover:bg-taupe-50 dark:hover:bg-taupe-900/20 hover:border-taupe-200 dark:hover:border-taupe-800',
            slate: 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/20 hover:border-slate-200 dark:hover:border-slate-800',
            orange: 'text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:border-orange-200 dark:hover:border-orange-800'
        };

        let dataAttrs = entityId ? `data-entity-id="${entityId}"` : '';
        for (const [key, value] of Object.entries(dataAttributes)) {
            dataAttrs += ` data-${key}="${value}"`;
        }

        return `
            <button class="${cssClass} inline-flex items-center gap-1 px-2 py-1 ${colorClasses[color]} rounded transition-colors text-xs font-medium border border-transparent" 
                    ${dataAttrs}
                    title="${title}">
                ${icon || (iconName ? renderSvgIcon(iconName, { className: iconClass }) : '')}
                ${text}
            </button>
        `;
    }

    // ========================================================================
    // 7. COMMON SVG ICONS (Reusable!)
    // ========================================================================

    const SVGIcons = {
        settings: `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
        </svg>`,

        edit: `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
        </svg>`,

        delete: `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
        </svg>`,

        view: `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
        </svg>`,

        sort: `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/>
        </svg>`,

        link: `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
        </svg>`,

        tag: `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
        </svg>`,

        plus: `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>`,

        check: `<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
        </svg>`,

        x: `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>`,

        trash: `<svg class="h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewbox="0 0 24 24" width="24" height="24" color="currentColor" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
\t<path d="M19.5 5.5L18.8803 15.5251C18.7219 18.0864 18.6428 19.3671 18.0008 20.2879C17.6833 20.7431 17.2747 21.1273 16.8007 21.416C15.8421 22 14.559 22 11.9927 22C9.42312 22 8.1383 22 7.17905 21.4149C6.7048 21.1257 6.296 20.7408 5.97868 20.2848C5.33688 19.3626 5.25945 18.0801 5.10461 15.5152L4.5 5.5"/>
\t<path d="M3 5.5H21M16.0557 5.5L15.3731 4.09173C14.9196 3.15626 14.6928 2.68852 14.3017 2.39681C14.215 2.3321 14.1231 2.27454 14.027 2.2247C13.5939 2 13.0741 2 12.0345 2C10.9688 2 10.436 2 9.99568 2.23412C9.8981 2.28601 9.80498 2.3459 9.71729 2.41317C9.32164 2.7167 9.10063 3.20155 8.65861 4.17126L8.05292 5.5"/>
\t<path d="M9.5 16.5L9.5 10.5"/>
\t<path d="M14.5 16.5L14.5 10.5"/>
</svg>`
    };

    const CommonSvgPaths = {
        download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
        upload: '<path d="M12 21V9"/><path d="m17 14-5-5-5 5"/><path d="M5 3h14"/>',
        printer: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/>',
        unavailable: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
        creditCard: '<rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/><path d="M6 15h4"/><path d="M14 15h2"/>',
        banknote: '<rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01"/><path d="M18 12h.01"/>',
        chartBar: '<path d="M3 3v18h18"/><path d="M7 16V9"/><path d="M12 16V5"/><path d="M17 16v-3"/>',
        shoppingBag: '<path d="M6 8h12l1 13H5L6 8Z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
        circleCheck: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
        clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
        boxes: '<path d="m7.5 4.27 4.5 2.6 4.5-2.6"/><path d="M3 8.2v7.6l6.5 3.75 6.5-3.75V8.2L9.5 4.45 3 8.2Z"/><path d="M9.5 12 3 8.2"/><path d="M9.5 12v7.55"/><path d="m9.5 12 6.5-3.8"/><path d="m14.5 10.15 6.5-3.75"/><path d="M14.5 10.15v7.6L21 14V6.4l-6.5 3.75Z"/>',
        truck: '<path d="M14 18V6H3v12h11Z"/><path d="M14 9h4l3 4v5h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
        rotateCcw: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
        arrowRight: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
        analyticsRevenue: '<rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01"/><path d="M18 12h.01"/>',
        analyticsAverageOrder: '<path d="M3 3v18h18"/><path d="M7 16V9"/><path d="M12 16V5"/><path d="M17 16v-3"/>',
        analyticsOrders: '<path d="M6 8h12l1 13H5L6 8Z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
        analyticsCompletionRate: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
        fulfillmentPending: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
        fulfillmentPreparing: '<path d="m7.5 4.27 4.5 2.6 4.5-2.6"/><path d="M3 8.2v7.6l6.5 3.75 6.5-3.75V8.2L9.5 4.45 3 8.2Z"/><path d="M9.5 12 3 8.2"/><path d="M9.5 12v7.55"/><path d="m9.5 12 6.5-3.8"/><path d="m14.5 10.15 6.5-3.75"/><path d="M14.5 10.15v7.6L21 14V6.4l-6.5 3.75Z"/>',
        fulfillmentShipped: '<path d="M14 18V6H3v12h11Z"/><path d="M14 9h4l3 4v5h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
        fulfillmentDelivered: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
        fulfillmentReturned: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
        list: '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>',
        mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
        chevronRight: '<path d="m9 18 6-6-6-6"/>',
        search: '<path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/>',
        filter: '<path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>',
        refresh: '<path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M16 8h5V3"/>',
        close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
        check: '<path d="M20 6 9 17l-5-5"/>',
        eye: '<path d="M2.06 12.35a1 1 0 0 1 0-.7A10.75 10.75 0 0 1 12 5a10.75 10.75 0 0 1 9.94 6.65 1 1 0 0 1 0 .7A10.75 10.75 0 0 1 12 19a10.75 10.75 0 0 1-9.94-6.65Z"/><circle cx="12" cy="12" r="3"/>',
        edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
        trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m19 6-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>',
        plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
        link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'
    };

    /**
     * Render a shared stroke SVG icon.
     * Keeps SVGIcons unchanged for older modules while giving new code a stable API.
     *
     * @param {string} name
     * @param {object} options
     * @returns {string}
     */
    function renderSvgIcon(name, options = {}) {
        const {
            className = 'w-4 h-4',
            strokeWidth = 2,
            title = '',
            style = ''
        } = options;
        const path = CommonSvgPaths[name];
        if (!path) return '';
        const titleMarkup = title ? `<title>${title}</title>` : '';
        const styleMarkup = style ? ` style="${style}"` : '';

        return `<svg class="${className}"${styleMarkup} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="${title ? 'false' : 'true'}">${titleMarkup}${path}</svg>`;
    }

    function hydrateIcons(root = document) {
        root.querySelectorAll('[data-admin-icon]').forEach((el) => {
            const iconName = el.getAttribute('data-admin-icon') || '';
            const className = el.getAttribute('data-admin-icon-class') || 'w-4 h-4';
            const strokeWidthRaw = el.getAttribute('data-admin-icon-stroke');
            const strokeWidth = strokeWidthRaw ? Number(strokeWidthRaw) : 2;
            const title = el.getAttribute('data-admin-icon-title') || '';

            el.innerHTML = renderSvgIcon(iconName, { className, strokeWidth, title });
        });
    }

    // ========================================================================
    // 8. MODAL TEMPLATE BUILDER (Reusable!)
    // ========================================================================

    /**
     * Build modal HTML template
     * Use in: All modules
     *
     * @param {object} config - Modal configuration
     * @returns {string} HTML
     */
    function buildModalTemplate(config) {
        const {
            id = '',
            title = '',
            content = '',
            footer = '',
            size = 'md', // sm, md, lg, xl
            icon = ''
        } = config;

        const sizeClasses = {
            sm: 'max-w-sm',
            md: 'max-w-md',
            lg: 'max-w-lg',
            xl: 'max-w-2xl',
            '2xl': 'max-w-4xl'
        };

        return `
            <div id="${id}" class="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 z-50 flex items-center justify-center hidden">
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl ${sizeClasses[size]} w-full mx-4 border border-transparent dark:border-gray-700">
                    <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100">${icon} ${title}</h3>
                        <button class="close-modal text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                    
                    <div class="modal-body">
                        ${content}
                    </div>
                    
                    ${footer ? `<div class="modal-footer px-6 py-4 border-t border-gray-200 dark:border-gray-700">${footer}</div>` : ''}
                </div>
            </div>
        `;
    }

    // ========================================================================
    // 9. STANDARD MODAL FOOTER (Reusable!)
    // ========================================================================

    /**
     * Build standard modal footer with Cancel/Submit buttons
     *
     * @param {object} options - Footer configuration
     * @returns {string} HTML
     */
    function buildModalFooter(options = {}) {
        const {
            cancelText = 'Cancel',
            submitText = 'Submit',
            submitColor = 'blue'
        } = options;

        const submitColorClasses = {
            blue: 'bg-blue-600 hover:bg-blue-700',
            green: 'bg-green-600 hover:bg-green-700',
            red: 'bg-red-600 hover:bg-red-700'
        };

        return `
            <div class="flex justify-end gap-3">
                <button type="button" class="close-modal px-4 py-2 text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                    ${cancelText}
                </button>
                <button type="submit" class="px-4 py-2 text-white ${submitColorClasses[submitColor]} rounded-lg transition-colors shadow-sm">
                    ${submitText}
                </button>
            </div>
        `;
    }

    // ========================================================================
    // 10. DATE FORMATTER (Reusable!)
    // ========================================================================

    /**
     * Format date string
     * Use in: All modules with timestamps
     *
     * @param {string} dateString - ISO date string
     * @param {object} options - Format options
     * @returns {string} Formatted date
     */
    function formatDate(dateString, options = {}) {
        const {
            format = 'full', // full, date, time, relative
            locale = 'en-US'
        } = options;

        if (!dateString) return '<span class="text-gray-400 dark:text-gray-500 italic">N/A</span>';

        const date = new Date(dateString);

        switch (format) {
            case 'date':
                return date.toLocaleDateString(locale);
            case 'time':
                return date.toLocaleTimeString(locale);
            case 'relative':
                return getRelativeTime(date);
            case 'full':
            default:
                return date.toLocaleString(locale);
        }
    }

    /**
     * Get relative time (e.g., "2 hours ago")
     */
    function getRelativeTime(date) {
        const now = new Date();
        const diff = now - date;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 7) return date.toLocaleDateString();
        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        return 'Just now';
    }

    // ========================================================================
    // 11. EVENT HANDLER HELPER (Reusable!)
    // ========================================================================

    /**
     * Setup button click handler (from languages-helpers-optimized)
     * Use in: All modules
     */
    function setupButtonHandler(selector, callback, options = {}) {
        const {
            preventDefault = true,
            stopPropagation = false,
            dataAttribute = 'data-entity-id',
            requireData = true
        } = options;

        document.addEventListener('click', async (e) => {
            const btn = e.target.closest(selector);
            if (!btn) return;

            if (preventDefault) e.preventDefault();
            if (stopPropagation) e.stopPropagation();

            const entityId = btn.getAttribute(dataAttribute);

            if (requireData && !entityId) {
                console.warn(`⚠️ Button ${selector} clicked but no ${dataAttribute} found`);
                return;
            }

            try {
                await callback(entityId, btn, e);
            } catch (error) {
                console.error(`❌ Error in ${selector} handler:`, error);
            }
        });
    }

    // ========================================================================
    // 12. CONFIRMATION DIALOG (Reusable!)
    // ========================================================================

    /**
     * Show confirmation dialog
     * Use in: Delete actions, destructive operations
     *
     * @param {object} config - Configuration
     * @returns {Promise<boolean>} User's choice
     */
    async function showConfirmation(config) {
        const {
            title = 'Confirm Action',
            message = 'Are you sure?',
            confirmText = 'Confirm',
            cancelText = 'Cancel',
            type = 'warning' // warning, danger, info
        } = config;

        // Simple browser confirm for now
        // Can be enhanced with custom modal later
        return confirm(`${title}\n\n${message}`);
    }

    // ========================================================================
    // Export to Window
    // ========================================================================

    window.AdminUIComponents = {
        // Renderers
        renderStatusBadge,
        renderCodeBadge,
        renderDirectionBadge,
        renderSortBadge,
        renderIcon,

        // Builders
        buildActionButton,
        buildModalTemplate,
        buildModalFooter,

        // Icons
        SVGIcons,
        icon: renderSvgIcon,
        hydrateIcons,

        // Utilities
        formatDate,
        setupButtonHandler,
        showConfirmation
    };

    hydrateIcons();

    console.log('✅ Admin UI Components Library loaded');
    console.log('   ↳ 13 reusable components available project-wide!');

})();
