# FreeSWITCH Custom Configuration Structure

## Directory Organization

### IVR Configuration (`ivr_configs/`)
- **ivr.conf.xml**: Main IVR configuration file
- **ivr_menus/**: Directory containing IVR menu definitions
  - **main_ivr.xml**: Main IVR menu with options 1 and 2

### Queue Configuration (`queue_configs/`)
- **callcenter.conf.xml**: Call center configuration with queues and agents

## Configuration Loading

The main `freeswitch.xml` file includes these custom directories:

```xml
<!-- IVR Configuration -->
<section name="ivr" description="IVR Menus">
  <X-PRE-PROCESS cmd="include" data="ivr_configs/*.xml"/>
</section>

<!-- Queue Configuration -->
<section name="callcenter" description="Call Center">
  <X-PRE-PROCESS cmd="include" data="queue_configs/*.xml"/>
</section>
```

## Benefits

1. **Organized Structure**: IVR and queue configurations are separated
2. **Easy Maintenance**: Clear separation of concerns
3. **Scalable**: Easy to add more IVR menus or queue configurations
4. **Clean**: No mixing with autoload_configs

## Adding New Configurations

### New IVR Menu:
1. Create XML file in `ivr_configs/ivr_menus/`
2. Define menu in the file
3. Reload XML: `fs_cli -x "reloadxml"`

### New Queue:
1. Edit `queue_configs/callcenter.conf.xml`
2. Add queue, agents, and tiers
3. Reload callcenter: `fs_cli -x "reload mod_callcenter"`
