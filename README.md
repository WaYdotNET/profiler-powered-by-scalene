# Profiler Powered by Scalene

[![Open VSX](https://img.shields.io/badge/Open%20VSX-ready-brightgreen)](https://open-vsx.org/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Rosé Pine](https://img.shields.io/badge/Theme-Ros%C3%A9%20Pine%20Dawn-ea9d34?logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgZmlsbD0iI2ZhZjRlZCIvPgogIDxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjYiIGZpbGw9IiNlYTlkMzQiLz4KPC9zdmc+)](https://rosepinetheme.com/)
[![GitHub](https://img.shields.io/badge/GitHub-WaYdotNET-blue?logo=github)](https://github.com/WaYdotNET)

A powerful VS Code extension for [Scalene](https://github.com/plasma-umass/scalene) - the AI-powered CPU, GPU, and memory profiler for Python.

**Built for Open VSX** - Works in Cursor, VSCodium, and other VS Code alternatives.

**Author:** [Carlo Bertini (WaYdotNET)](https://github.com/WaYdotNET)

---

## 🎯 Inspired By

This extension is **inspired by** the official [Scalene VS Code Extension](https://github.com/plasma-umass/scalene-vscode-extension) by [Emery Berger](https://github.com/emeryberger).

The original extension is available on the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=EmeryBerger.scalene) but **not on Open VSX**, which is required for Cursor, VSCodium, and other open-source VS Code alternatives.

---

## ✨ What's Different from the Original

| Feature | Original Extension | This Extension |
|---------|-------------------|----------------|
| **Open VSX Support** | ❌ Not available | ✅ Available |
| **Built-in Profile Viewer** | ❌ Opens in browser only | ✅ Integrated webview with [Rosé Pine Dawn](https://rosepinetheme.com/) theme |
| **Source Code Display** | ❌ Not shown | ✅ **Shows source code for each line** |
| **Complete Metrics** | ⚠️ Basic | ✅ **All Scalene metrics (CPU, Memory, Peak, Copy, Growth)** |
| **Function Profiles** | ❌ Not available | ✅ **Dedicated function profile view** |
| **Memory Leak Detection UI** | ❌ CLI output only | ✅ Dedicated "Potential Leaks" tab **with code** |
| **Memory-Only Mode** | ❌ Not available | ✅ Focus profiling on memory |
| **Profile Selected Code** | ❌ Not available | ✅ Profile just selected region |
| **Auto-detect Python** | ⚠️ Basic | ✅ Integrates with VS Code Python extension |
| **uv Support** | ❌ | ✅ **Auto-detects uv + pyproject.toml** |
| **Status Bar Integration** | ❌ Not available | ✅ Quick access from status bar |
| **Namespace** | `scalene.*` | `profilerScalene.*` (no conflicts!) |
| **Codebase** | JavaScript | TypeScript with strict mode |

---

## Features

| Feature | Description |
|---------|-------------|
| 🔥 **CPU Profiling** | Line-level CPU usage with Python vs native code breakdown |
| 💾 **Memory Profiling** | Track memory allocations, peak usage, and copy operations per line |
| 🚨 **Memory Leak Detection** | Automatically identifies potential memory leaks **with source code** |
| 📊 **Built-in Profile Viewer** | Beautiful [Rosé Pine Dawn](https://rosepinetheme.com/) themed webview showing **source code + all metrics** |
| ⚡ **Function Profiles** | See which functions consume the most resources |
| 📝 **Source Code Display** | See the actual code for each profiled line |
| 🌐 **Scalene Web Viewer** | Open profiles in Scalene's native web UI |
| ⚡ **Low Overhead** | Sampling-based profiling with minimal slowdown |
| 🔧 **Auto-Install** | Automatically installs Scalene with uv or pip |

## Requirements

- Python 3.8+
- Scalene (auto-installed if missing)
- Optional: uv (for faster installation if pyproject.toml exists)

## Quick Start

1. Open a Python file
2. Click the **🔥 Profiler** button in the status bar, or
3. Right-click → **Profiler: Profile Current File**
4. View results in the integrated viewer with **source code + metrics**

## Commands

| Command | Description |
|---------|-------------|
| `Profiler: Profile Current File` | Profile the entire file |
| `Profiler: Profile Memory Only` | Focus on memory profiling |
| `Profiler: Profile Selected Code` | Profile selected code region |
| `Profiler: View Last Profile` | Open built-in profile viewer |
| `Profiler: Open in Scalene Web Viewer` | Open in browser |
| `Profiler: Stop Profiling` | Stop current session |
| `Profiler: Install Scalene` | Install/update Scalene (auto-detects uv) |

## Profile Viewer

The built-in profile viewer uses the **[Rosé Pine Dawn](https://rosepinetheme.com/)** theme (WCAG AAA compliant) and has four tabs:

### 📊 Line Profile

Shows for each line:
- **Line Number**
- **📝 Source Code** (the actual code!)
- **CPU (Python)** - Time in Python code
- **CPU (Native)** - Time in C/C++ libraries
- **Memory (Avg MB)** - Average memory allocated
- **Memory (Peak MB)** - Peak memory usage
- **Copy (MB/s)** - Memory copy rate (high = inefficient)
- **Growth (MB)** - Memory growth (leak indicator)

### ⚡ Functions

- Function name and location
- CPU time breakdown
- Memory usage
- Peak memory

### 🚨 Potential Leaks

- **📝 Source code** of leaking lines
- Leak score (0-100%)
- Memory allocated
- File:Line location

### 📖 About

- Complete metrics guide and quick tips
- Color coding reference
- Links to Scalene, extension repository, and theme

## Extension Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `profilerScalene.pythonPath` | Python interpreter path | Auto-detect |
| `profilerScalene.cpuSamplingRate` | CPU sampling rate (seconds) | `0.01` |
| `profilerScalene.reducedProfile` | Only show significant lines | `true` |
| `profilerScalene.outputDirectory` | Profile output directory | `.scalene-profiles` |
| `profilerScalene.autoOpenViewer` | Auto-open viewer after profiling | `true` |
| `profilerScalene.showMemoryLeaks` | Show potential leaks tab | `true` |


## Development

```bash
npm install       # Install dependencies
npm run compile   # Build
npm run watch     # Watch mode
npm run package   # Create .vsix
```

**Requirements:** Node.js 18+, npm

## Installation

### From Open VSX (Cursor/VSCodium)

Search for "Profiler Powered by Scalene" in the Extensions view, or:

```
ext install WaYdotNET.profiler-powered-by-scalene
```

### From VSIX

1. Download the `.vsix` file from [Releases](https://github.com/WaYdotNET/profiler-powered-by-scalene/releases)
2. In VS Code/Cursor: `Ctrl+Shift+P` → "Install from VSIX"
3. Select the `.vsix` file

## 🐍 Profiling Django Applications

### Method 1: Test Client Script (⭐ Recommended)

```python
# profile_api.py
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')
django.setup()

from django.test import Client
client = Client()

for i in range(100):
    response = client.get('/api/users/')
    print(f"✓ {i}: {response.status_code}")
```

Run: **Profiler: Profile Current File** on `profile_api.py`

### Method 2: Profile runserver

```bash
scalene run -o profile.json manage.py --- runserver 0:8000 --noreload
# Make requests, then Ctrl+C
# In Cursor: Profiler: View Last Profile
```

⚠️ Always use `--noreload` to prevent auto-reloader issues

---

### Method 3: Profile Specific View

```python
# profile_view.py
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')
django.setup()

from myapp.views import expensive_view
from django.test import RequestFactory

for i in range(50):
    request = RequestFactory().get('/my-url/')
    response = expensive_view(request)
```

### Method 4: Profile Management Command

```python
# profile_command.py
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')
from django.core.management import execute_from_command_line

execute_from_command_line(['manage.py', 'your_command', '--args'])
```

---

### Method 5: Profile ORM Queries

```python
# profile_queries.py
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')
django.setup()

from myapp.models import User

users = User.objects.all()[:100]
for user in users:
    orders = user.orders.all()  # N+1 query?
    print(f"User {user.id}: {len(orders)} orders")
```

**Look for:** High CPU (Native) = DB calls, High Memory (Peak) = Large querysets

---

### 🔍 What to Look For

| Issue | Indicator | Solution |
|-------|-----------|----------|
| **Memory Leak** | Growth > 0, Growth Rate > 110% | Check cached querysets, signal handlers, sessions |
| **Slow Views** | High CPU (Python) | Optimize serializers, templates, business logic |
| **Database** | High CPU (Native) | Use `select_related()`, `prefetch_related()`, check N+1 queries |
| **Memory Usage** | High Peak MB | Use `.iterator()`, pagination, streaming |

### 💡 Best Practices

- ✅ Use `--noreload` with runserver profiling
- ✅ Profile 50-100 iterations for reliable data
- ✅ Use **Profiler: Profile Memory Only** for leak detection
- ✅ Profile realistic workloads (not empty DBs)

## Credits

- **[Scalene](https://github.com/plasma-umass/scalene)** - The underlying profiler by Emery Berger, Sam Stern, and Juan Altmayer Pizzorno
- **[Original VS Code Extension](https://github.com/plasma-umass/scalene-vscode-extension)** - Inspiration for this extension by Emery Berger
- **[Carlo Bertini (WaYdotNET)](https://github.com/WaYdotNET)** - Author of this enhanced Open VSX version

## License

Apache License 2.0 - see [LICENSE](LICENSE)

---

**Made with ❤️ by [WaYdotNET](https://github.com/WaYdotNET)**
