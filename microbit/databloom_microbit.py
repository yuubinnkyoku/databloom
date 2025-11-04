# Databloom micro:bit sender (MakeCode Python)
#
# IMPORTANT: Before using this code in MakeCode (makecode.microbit.org):
# 1. Create a new project and switch to Python mode
# 2. Click "Extensions" in the toolbox
# 3. Search for and add the "bluetooth" extension
# 4. Then paste this code into the editor
#
# Sends CSV lines over BLE UART (Nordic UART Service):
#   seq,moistureRaw,tempC,lightRaw\n
#
# Pins / sensors:
# - moistureRaw: AnalogPin.P0 (0-1023). Connect soil moisture sensor analog output to P0.
# - tempC: built-in temperature sensor via input.temperature() (°C, integer)
# - lightRaw: built-in light level via input.light_level() (0-255)
#
# Notes:
# - The web app filters for device name starting with "BBC micro:bit" and subscribes to NUS TX.
# - Keep output exactly CSV with a trailing newline. One sample per ~250ms (~4 Hz).
# - Sequence wraps at 65536.

SEQ_MOD = 65536

bluetooth.start_uart_service()

seq = 0

def on_forever():
    global seq
    # Read sensors
    moisture = pins.analog_read_pin(AnalogPin.P0)  # 0-1023
    temp_c = input.temperature()                   # integer °C
    light_val = input.light_level()                # 0-255

    # Compose CSV line: seq,moistureRaw,tempC,lightRaw\n
    line = str(seq) + "," + str(moisture) + "," + str(temp_c) + "," + str(light_val)
    bluetooth.uart_write_line(line)

    # Increment sequence (wrap at 16-bit)
    seq = (seq + 1) % SEQ_MOD

    # Send ~4 Hz
    basic.pause(250)

basic.forever(on_forever)
