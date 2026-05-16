package com.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class PageController {

    @GetMapping("/")
    public String root() {
        return "redirect:/login";
    }

    @GetMapping("/login")
    public String loginPage() {
        return "redirect:/Html/login.html";
    }

    @GetMapping("/register")
    public String registerPage() {
        return "redirect:/Html/register.html";
    }

    @GetMapping("/dashboard")
    public String dashboardPage() {
        return "redirect:/Html/dashboard.html";
    }

    @GetMapping("/settings")
    public String settingsPage() {
        return "redirect:/Html/settings.html"; // "sttings" hatası düzeltildi
    }
}