package com.example.mypolicy.model;

import android.widget.EditText;

import java.util.Date;



import android.widget.EditText;

import java.util.Date;


public class Policy {
    private long p_code;
    private String title;
    private String uri;
    private Date apply_start;
    private Date apply_end;

    private String contents;
    private String dor;
    private String si;

    public long getP_code() {
        return p_code;
    }

    public void setP_code(long p_code) {
        this.p_code = p_code;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getUri() {
        return uri;
    }

    public void setUri(String uri) {
        this.uri = uri;
    }

    public Date getApply_start() {
        return apply_start;
    }

    public void setApply_start(Date apply_start) {
        this.apply_start = apply_start;
    }

    public Date getApply_end() {
        return apply_end;
    }

    public void setApply_end(Date apply_end) {
        this.apply_end = apply_end;
    }

    public String getContents() {
        return contents;
    }

    public void setContents(String contents) {
        this.contents = contents;
    }

    public String getDor() {
        return dor;
    }

    public void setDor(String dor) {
        this.dor = dor;
    }

    public String getSi() {
        return si;
    }

    public void setSi(String si) {
        this.si = si;
    }
}