; This program is free software: you can redistribute it and/or modify
; it under the terms of the GNU Affero General Public License as published by
; the Free Software Foundation, either version 3 of the License, or
; (at your option) any later version.
;
; This program is distributed in the hope that it will be useful,
; but WITHOUT ANY WARRANTY; without even the implied warranty of
; MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
; GNU Affero General Public License for more details.
;
; You should have received a copy of the GNU Affero General Public License
; along with this program. If not, see https://www.gnu.org/licenses/.

; Forward
; ----------------------------

; These three are the same, but they differ (in the C side) by their return type.
; Unlike the three next functions, these ones don't forward XMM argument registers.
public ForwardCallG
public ForwardCallF
public ForwardCallD

; The X variants are slightly slower, and are used when XMM arguments must be forwarded.
public ForwardCallXG
public ForwardCallXF
public ForwardCallXD

.code

; Copy function pointer to RAX, in order to save it through argument forwarding.
; Also make a copy of the SP to CallData::old_sp because the callback system might need it.
; Save RSP in RBX (non-volatile), and use carefully assembled stack provided by caller.
prologue macro
    endbr64
    mov rax, rcx
    push rbx
    .pushreg rbx
    mov rbx, rsp
    mov qword ptr [r8+0], rsp
    .setframe rbx, 0
    .endprolog
    mov rsp, rdx
endm

; Call native function.
; Once done, restore normal stack pointer and return.
; The return value is passed untouched through RAX or XMM0.
epilogue macro
    call rax
    mov rsp, rbx
    pop rbx
    ret
endm

; Prepare integer argument registers from array passed by caller.
forward_gpr macro
    mov r9, qword ptr [rdx+24]
    mov r8, qword ptr [rdx+16]
    mov rcx, qword ptr [rdx+0]
    mov rdx, qword ptr [rdx+8]
endm

; Prepare XMM argument registers from array passed by caller.
forward_xmm macro
    movsd xmm3, qword ptr [rdx+24]
    movsd xmm2, qword ptr [rdx+16]
    movsd xmm1, qword ptr [rdx+8]
    movsd xmm0, qword ptr [rdx+0]
endm

ForwardCallG proc frame
    prologue
    forward_gpr
    epilogue
ForwardCallG endp

ForwardCallF proc frame
    prologue
    forward_gpr
    epilogue
ForwardCallF endp

ForwardCallD proc frame
    prologue
    forward_gpr
    epilogue
ForwardCallD endp

ForwardCallXG proc frame
    prologue
    forward_xmm
    forward_gpr
    epilogue
ForwardCallXG endp

ForwardCallXF proc frame
    prologue
    forward_xmm
    forward_gpr
    epilogue
ForwardCallXF endp

ForwardCallXD proc frame
    prologue
    forward_xmm
    forward_gpr
    epilogue
ForwardCallXD endp

; Callback trampolines
; ----------------------------

public Trampoline0
public Trampoline1
public Trampoline2
public Trampoline3
public Trampoline4
public Trampoline5
public Trampoline6
public Trampoline7
public Trampoline8
public Trampoline9
public Trampoline10
public Trampoline11
public Trampoline12
public Trampoline13
public Trampoline14
public Trampoline15
public Trampoline16
public Trampoline17
public Trampoline18
public Trampoline19
public Trampoline20
public Trampoline21
public Trampoline22
public Trampoline23
public Trampoline24
public Trampoline25
public Trampoline26
public Trampoline27
public Trampoline28
public Trampoline29
public Trampoline30
public Trampoline31
public TrampolineX0
public TrampolineX1
public TrampolineX2
public TrampolineX3
public TrampolineX4
public TrampolineX5
public TrampolineX6
public TrampolineX7
public TrampolineX8
public TrampolineX9
public TrampolineX10
public TrampolineX11
public TrampolineX12
public TrampolineX13
public TrampolineX14
public TrampolineX15
public TrampolineX16
public TrampolineX17
public TrampolineX18
public TrampolineX19
public TrampolineX20
public TrampolineX21
public TrampolineX22
public TrampolineX23
public TrampolineX24
public TrampolineX25
public TrampolineX26
public TrampolineX27
public TrampolineX28
public TrampolineX29
public TrampolineX30
public TrampolineX31
extern RelayCallback : PROC
public CallSwitchStack

; First, make a copy of the GPR argument registers (rcx, rdx, r8, r9).
; Then call the C function RelayCallback with the following arguments:
; static trampoline ID, a pointer to the saved GPR array, a pointer to the stack
; arguments of this call, and a pointer to a struct that will contain the result registers.
; After the call, simply load these registers from the output struct.
trampoline macro ID
    endbr64
    sub rsp, 120
    .allocstack 120
    .endprolog
    mov qword ptr [rsp+32], rcx
    mov qword ptr [rsp+40], rdx
    mov qword ptr [rsp+48], r8
    mov qword ptr [rsp+56], r9
    mov rcx, ID
    lea rdx, qword ptr [rsp+32]
    lea r8, qword ptr [rsp+160]
    lea r9, qword ptr [rsp+96]
    call RelayCallback
    mov rax, qword ptr [rsp+96]
    add rsp, 120
    ret
endm

; Same thing, but also forward the XMM argument registers and load the XMM result registers.
trampoline_xmm macro ID
    endbr64
    sub rsp, 120
    .allocstack 120
    .endprolog
    mov qword ptr [rsp+32], rcx
    mov qword ptr [rsp+40], rdx
    mov qword ptr [rsp+48], r8
    mov qword ptr [rsp+56], r9
    movsd qword ptr [rsp+64], xmm0
    movsd qword ptr [rsp+72], xmm1
    movsd qword ptr [rsp+80], xmm2
    movsd qword ptr [rsp+88], xmm3
    mov rcx, ID
    lea rdx, qword ptr [rsp+32]
    lea r8, qword ptr [rsp+160]
    lea r9, qword ptr [rsp+96]
    call RelayCallback
    mov rax, qword ptr [rsp+96]
    movsd xmm0, qword ptr [rsp+104]
    add rsp, 120
    ret
endm

Trampoline0 proc frame
    trampoline 0
Trampoline0 endp
Trampoline1 proc frame
    trampoline 1
Trampoline1 endp
Trampoline2 proc frame
    trampoline 2
Trampoline2 endp
Trampoline3 proc frame
    trampoline 3
Trampoline3 endp
Trampoline4 proc frame
    trampoline 4
Trampoline4 endp
Trampoline5 proc frame
    trampoline 5
Trampoline5 endp
Trampoline6 proc frame
    trampoline 6
Trampoline6 endp
Trampoline7 proc frame
    trampoline 7
Trampoline7 endp
Trampoline8 proc frame
    trampoline 8
Trampoline8 endp
Trampoline9 proc frame
    trampoline 9
Trampoline9 endp
Trampoline10 proc frame
    trampoline 10
Trampoline10 endp
Trampoline11 proc frame
    trampoline 11
Trampoline11 endp
Trampoline12 proc frame
    trampoline 12
Trampoline12 endp
Trampoline13 proc frame
    trampoline 13
Trampoline13 endp
Trampoline14 proc frame
    trampoline 14
Trampoline14 endp
Trampoline15 proc frame
    trampoline 15
Trampoline15 endp
Trampoline16 proc frame
    trampoline 16
Trampoline16 endp
Trampoline17 proc frame
    trampoline 17
Trampoline17 endp
Trampoline18 proc frame
    trampoline 18
Trampoline18 endp
Trampoline19 proc frame
    trampoline 19
Trampoline19 endp
Trampoline20 proc frame
    trampoline 20
Trampoline20 endp
Trampoline21 proc frame
    trampoline 21
Trampoline21 endp
Trampoline22 proc frame
    trampoline 22
Trampoline22 endp
Trampoline23 proc frame
    trampoline 23
Trampoline23 endp
Trampoline24 proc frame
    trampoline 24
Trampoline24 endp
Trampoline25 proc frame
    trampoline 25
Trampoline25 endp
Trampoline26 proc frame
    trampoline 26
Trampoline26 endp
Trampoline27 proc frame
    trampoline 27
Trampoline27 endp
Trampoline28 proc frame
    trampoline 28
Trampoline28 endp
Trampoline29 proc frame
    trampoline 29
Trampoline29 endp
Trampoline30 proc frame
    trampoline 30
Trampoline30 endp
Trampoline31 proc frame
    trampoline 31
Trampoline31 endp

TrampolineX0 proc frame
    trampoline_xmm 0
TrampolineX0 endp
TrampolineX1 proc frame
    trampoline_xmm 1
TrampolineX1 endp
TrampolineX2 proc frame
    trampoline_xmm 2
TrampolineX2 endp
TrampolineX3 proc frame
    trampoline_xmm 3
TrampolineX3 endp
TrampolineX4 proc frame
    trampoline_xmm 4
TrampolineX4 endp
TrampolineX5 proc frame
    trampoline_xmm 5
TrampolineX5 endp
TrampolineX6 proc frame
    trampoline_xmm 6
TrampolineX6 endp
TrampolineX7 proc frame
    trampoline_xmm 7
TrampolineX7 endp
TrampolineX8 proc frame
    trampoline_xmm 8
TrampolineX8 endp
TrampolineX9 proc frame
    trampoline_xmm 9
TrampolineX9 endp
TrampolineX10 proc frame
    trampoline_xmm 10
TrampolineX10 endp
TrampolineX11 proc frame
    trampoline_xmm 11
TrampolineX11 endp
TrampolineX12 proc frame
    trampoline_xmm 12
TrampolineX12 endp
TrampolineX13 proc frame
    trampoline_xmm 13
TrampolineX13 endp
TrampolineX14 proc frame
    trampoline_xmm 14
TrampolineX14 endp
TrampolineX15 proc frame
    trampoline_xmm 15
TrampolineX15 endp
TrampolineX16 proc frame
    trampoline_xmm 16
TrampolineX16 endp
TrampolineX17 proc frame
    trampoline_xmm 17
TrampolineX17 endp
TrampolineX18 proc frame
    trampoline_xmm 18
TrampolineX18 endp
TrampolineX19 proc frame
    trampoline_xmm 19
TrampolineX19 endp
TrampolineX20 proc frame
    trampoline_xmm 20
TrampolineX20 endp
TrampolineX21 proc frame
    trampoline_xmm 21
TrampolineX21 endp
TrampolineX22 proc frame
    trampoline_xmm 22
TrampolineX22 endp
TrampolineX23 proc frame
    trampoline_xmm 23
TrampolineX23 endp
TrampolineX24 proc frame
    trampoline_xmm 24
TrampolineX24 endp
TrampolineX25 proc frame
    trampoline_xmm 25
TrampolineX25 endp
TrampolineX26 proc frame
    trampoline_xmm 26
TrampolineX26 endp
TrampolineX27 proc frame
    trampoline_xmm 27
TrampolineX27 endp
TrampolineX28 proc frame
    trampoline_xmm 28
TrampolineX28 endp
TrampolineX29 proc frame
    trampoline_xmm 29
TrampolineX29 endp
TrampolineX30 proc frame
    trampoline_xmm 30
TrampolineX30 endp
TrampolineX31 proc frame
    trampoline_xmm 31
TrampolineX31 endp

; When a callback is relayed, Koffi will call into Node.js and V8 to execute Javascript.
; The problem is that we're still running on the separate Koffi stack, and V8 will
; probably misdetect this as a "stack overflow". We have to restore the old
; stack pointer, call Node.js/V8 and go back to ours.
; The first three parameters (rcx, rdx, r8) are passed through untouched.
CallSwitchStack proc frame
    endbr64
    push rbx
    .pushreg rbx
    mov rbx, rsp
    .setframe rbx, 0
    .endprolog
    mov rax, qword ptr [rsp+56]
    mov r10, rsp
    mov r11, qword ptr [rsp+48]
    sub r10, qword ptr [r11+0]
    and r10, -16
    mov qword ptr [r11+8], r10
    lea rsp, [r9-32]
    call rax
    mov rsp, rbx
    pop rbx
    ret
CallSwitchStack endp

end
