# Spinnaker Handler Design

## Overview

Add support for creating rich links from Spinnaker pipeline execution pages. The handler will extract application and pipeline names, support double-click behavior to toggle between specific execution links and executions list links.

## URL Pattern Matching

**Target URLs:**
- Pattern: `spinnaker.k8s.*.cloud/#/applications/{app-name}/executions`
- Domains: alpha-shadowbox, shadowbox, staging-shadowbox (any subdomain)
- Applications: Any application name

**Examples:**
- Executions list: `https://spinnaker.k8s.alpha-shadowbox.cloud/#/applications/custom-domain-provisioner/executions`
- Specific execution: `https://spinnaker.k8s.alpha-shadowbox.cloud/#/applications/custom-domain-provisioner/executions/01KC50EDEH22WVMJP2PPYYNM1T?stage=0&step=0`

**Implementation:**
- Use regex to match `spinnaker.k8s.*.cloud` domain pattern flexibly
- Extract application name from URL path
- Detect if viewing specific execution (URL contains execution ID after `/executions/`)

## DOM Extraction Logic

**Finding the Active Pipeline Name:**

When on a specific execution page:

1. Look for container with class `execution-groups all-execution-groups`
2. Find all execution divs (have `id="execution-{executionId}"`)
3. Extract execution ID from current URL (part after `/executions/`)
4. Find execution div whose `id` matches `execution-{urlExecutionId}`
5. Traverse up to parent `execution-group-container`
6. Extract pipeline name from `<h4 class="execution-group-title">` within that container

**Fallback Strategy:**
- If pipeline name cannot be found, fall back to application name only
- Log debug messages at each step for troubleshooting

## Double-Click Behavior

**Mechanism:**
- Use existing caching mechanism from `WebpageInfo.getCached()`
- Cache WebpageInfo after first copy with 1000ms expiration
- On second click within 1000ms, detect same page and switch to executions list

**First Click (specific execution):**
- Title text: `{application-name}: {pipeline-name}`
  - Example: `custom-domain-provisioner: Deploy custom-domain-provisioner ALPHA`
- URL: Full execution URL with execution ID and parameters
- Preview: Shows title with pipeline name

**Second Click (executions list):**
- Title text: `{application-name}`
  - Example: `custom-domain-provisioner`
- URL: Base executions URL (strip execution ID and everything after)
  - Example: `https://spinnaker.k8s.alpha-shadowbox.cloud/#/applications/custom-domain-provisioner/executions`
- Preview: Shows just application name

## Implementation Notes

- Follow existing handler pattern (extend `richlinker.Handler`)
- Add to handlers array in richlinker.js
- Use NotificationSystem for debug logging
- Handle edge cases gracefully (missing elements, parsing failures)
