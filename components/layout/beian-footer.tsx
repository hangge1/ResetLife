import Image from "next/image";

type BeianFooterProps = {
  className?: string;
};

export function BeianFooter({ className = "site-footer" }: BeianFooterProps) {
  return (
    <footer className={className}>
      <p className="m-0">Copyright © 2026 张治航</p>
      <p className="m-0 mt-2">
        经营性网站备案信息：
        <a href="https://beian.miit.gov.cn/" rel="noreferrer" target="_blank">
          苏ICP备2026044129号
        </a>
      </p>
      <p className="m-0 mt-2">
        <a
          className="site-footer__police-beian"
          href="https://beian.mps.gov.cn/#/query/webSearch?code=32011202001787"
          rel="noreferrer"
          target="_blank"
        >
          <Image
            alt=""
            aria-hidden="true"
            className="site-footer__beian-icon"
            height={18}
            src="/beian-police.png"
            width={18}
          />
          <span>苏公网安备32011202001787号</span>
        </a>
      </p>
    </footer>
  );
}
