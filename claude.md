# Project Memory

## React Development Server Fix

**Problem**: React development server (`npm start`) was not accessible via `localhost:3001` despite showing successful compilation. Server was binding to IPv6 `[::1]` instead of IPv4 `127.0.0.1`, causing localhost connectivity issues.

**Solution**: Start the React development server with explicit host binding:

```bash
BROWSER=none FAST_REFRESH=true HOST=localhost PORT=3001 npm start
```

**Key Environment Variables**:
- `HOST=localhost` - Forces binding to localhost interface (crucial fix)
- `FAST_REFRESH=true` - Enables hot module replacement without page refreshes
- `BROWSER=none` - Prevents automatic browser opening
- `PORT=3001` - Specifies port (default is 3001 anyway)

**Result**: 
- Server accessible at `http://localhost:3001`
- Hot reload works properly (edits visible without page refresh)
- No loss of scroll position or form state during updates

**Diagnosis Commands**:
- `lsof -nP -iTCP:3001 | grep LISTEN` - Check what's listening on port 3001
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:3001` - Test connectivity